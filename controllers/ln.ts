import { Response } from 'express';
import { authenticatedLndGrpc, createInvoice, subscribeToInvoice, decodePaymentRequest, getRouteToDestination, pay } from 'lightning';
import { AuthenticatedRequest } from '../types/express';
import Invoice from '../models/invoice';
import UserWithdrawal from '../models/userWithdrawal';
import { updateUserBalance, getUserBalance } from '../utils/user_balance';

const lnd = (function () {
  if (process.env.LND_CERT && process.env.LND_MACAROON && process.env.LND_SOCKET) {
    try {
      const { lnd } = authenticatedLndGrpc({
        cert: process.env.LND_CERT,
        macaroon: process.env.LND_MACAROON,
        socket: process.env.LND_SOCKET,
      });
      return lnd;
    } catch (error) {
      console.error('Failed to initialize Lightning Network gRPC client:', error);
      return null;
    }
  } else {
    console.warn('Lightning Network credentials missing. LND will be unavailable.');
    return null;
  }
})()

export const deposit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pubkey = req.user?.pubkey;
    if (!pubkey) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (req.user?.test) {
      res.status(403).json({ error: 'Deposits are disabled while in Test Mode.' });
      return;
    }

    const { amount } = req.body; // in satoshis
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    if (!lnd) {
      res.status(503).json({ error: 'Lightning node is currently unavailable' });
      return;
    }

    const invoiceParams = { lnd, tokens: amount };
    const generatedInvoice = await createInvoice(invoiceParams);

    // Save to DB
    const dbInvoice = new Invoice({
      user_npub: pubkey,
      payment_request: generatedInvoice.request,
      amount: amount,
      status: 'PENDING',
    });
    await dbInvoice.save();

    res.status(200).json({ payment_request: generatedInvoice.request });

    // Subscribe to invoice using lightning package
    const sub = subscribeToInvoice({ id: generatedInvoice.id, lnd });

    sub.on('invoice_updated', async (updatedInvoice) => {
      if (updatedInvoice.is_confirmed) {
        try {
          const currentInvoice = await Invoice.findById(dbInvoice._id);
          if (currentInvoice && currentInvoice.status === 'PENDING') {
            currentInvoice.status = 'CONFIRMED';
            await currentInvoice.save();

            // the user is populated in req.user, let's use the object ID to credit BTC
            if (req.user && req.user._id) {
              await updateUserBalance(req.user._id, 'BTC', amount);
              console.log(`Credited ${amount} sats to user ${pubkey}`);
            }
          }
        } catch (updateErr) {
          console.error('Error updating invoice confirmation:', updateErr);
        }
      }
    });

    sub.on('error', (err) => {
      console.error('Invoice subscription error:', err);
    });

  } catch (error) {
    console.error('Error creating deposit invoice:', error);
    res.status(500).json({ error: 'Internal server error while creating invoice' });
  }
};

export const withdraw = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pubkey = req.user?.pubkey;
    if (!pubkey) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (req.user?.test) {
      res.status(403).json({ error: 'Test users cannot withdraw funds' });
      return;
    }

    const { paymentRequest } = req.body;
    if (!paymentRequest || typeof paymentRequest !== 'string') {
      res.status(400).json({ error: 'Invalid payment request' });
      return;
    }

    if (!lnd) {
      res.status(503).json({ error: 'Lightning node is currently unavailable' });
      return;
    }

    // Decode invoice
    const decoded = await decodePaymentRequest({ lnd, request: paymentRequest });
    const amount = decoded.tokens;

    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Zero-amount invoices are not supported' });
      return;
    }

    // Calculate routing fees
    let maxFee = 0;
    try {
      const { route } = await getRouteToDestination({
        lnd,
        destination: decoded.destination,
        tokens: amount,
      });
      if (!route) {
        res.status(400).json({ error: 'Cannot find a route to destination' });
        return;
      }
      maxFee = (route.safe_fee || 0) + 10;
    } catch (routeErr) {
      console.warn('Failed to find route directly, estimating max fee', routeErr);
      res.status(400).json({ error: 'Cannot find a route to destination to calculate fees' });
      return;
    }

    // Check balance
    const userBalance = await getUserBalance(req.user!._id, 'BTC');
    if (userBalance < amount + maxFee) {
      res.status(400).json({ error: `Insufficient balance. Need ${amount + maxFee} sats including estimated fees.` });
      return;
    }

    // Pre-deduct balance
    await updateUserBalance(req.user!._id, 'BTC', -(amount + maxFee));

    // Save PENDING withdrawal
    const withdrawal = new UserWithdrawal({
      user_npub: pubkey,
      payment_request: paymentRequest,
      amount,
      fees: maxFee,
      status: 'PENDING'
    });
    await withdrawal.save();

    // Pay invoice
    try {
      const payment = await pay({ lnd, request: paymentRequest, max_fee: maxFee });

      withdrawal.status = 'CONFIRMED';
      await withdrawal.save();

      res.status(200).json({ success: true, payment });
    } catch (payErr: any) {
      console.error('Lightning payment failed. Manual intervention required:', payErr);
      withdrawal.status = 'FAILED';
      await withdrawal.save();

      res.status(500).json({ error: 'Payment failed. Please contact the administrator for a manual refund. Reason: ' + payErr.message });
    }
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({ error: 'Internal server error while processing withdrawal' });
  }
};
