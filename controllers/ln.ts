import { Response } from 'express';
import { authenticatedLndGrpc, createInvoice, subscribeToInvoice } from 'lightning';
import { AuthenticatedRequest } from '../types/express';
import Invoice from '../models/invoice';
import { updateUserBalance } from '../utils/user_balance';

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
  res.status(501).json({ error: 'Not Implemented' });
};
