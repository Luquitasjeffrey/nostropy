import { Request, Response } from 'express';
import { connectDB } from '../utils/db';
import { getOrCreateUser } from '../utils/user_balance';
import Cryptocurrency from '../models/cryptocurrency';
import Invoice from '../models/invoice';
import { AuthenticatedRequest } from '../types/express';

export const getBalance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pubkey = req.user?.pubkey;

    if (!pubkey) {
      res.status(400).json({ error: 'Missing pubkey' });
      return;
    }

    await connectDB();
    const user = await getOrCreateUser(pubkey);

    // Populate balances with currency info
    const balances = await Promise.all(
      user.balances.map(async (b) => {
        const currency = await Cryptocurrency.findById(b.currency);
        return {
          symbol: currency?.symbol,
          name: currency?.name,
          image: currency?.image,
          amount: b.amount,
          decimal_places: currency?.decimal_places,
        };
      })
    );

    res.status(200).json({ balances });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCurrencies = async (req: Request, res: Response): Promise<void> => {
  try {
    await connectDB();
    const currencies = await Cryptocurrency.find();
    res.status(200).json({ currencies });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const faucet = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pubkey = req.user?.pubkey;
    if (!pubkey) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await connectDB();
    const user = await getOrCreateUser(pubkey);

    if (!user.test) {
      const confirmedInvoice = await Invoice.findOne({
        user_npub: pubkey,
        status: 'CONFIRMED',
      });

      if (confirmedInvoice) {
        res.status(403).json({
          error: 'Faucet is disabled for users with real deposits to prevent accidental loss of funds.',
        });
        return;
      }
    }

    const btcCurrency = await Cryptocurrency.findOne({ symbol: 'BTC' });
    if (!btcCurrency) {
      res.status(500).json({ error: 'BTC currency not found' });
      return;
    }

    const amountToAdd = 0.1 * Math.pow(10, btcCurrency.decimal_places);
    const balanceIndex = user.balances.findIndex(
      (b) => b.currency.toString() === btcCurrency._id.toString()
    );

    if (balanceIndex === -1) {
      user.balances.push({
        currency: btcCurrency._id,
        amount: amountToAdd,
      });
    } else {
      user.balances[balanceIndex].amount += amountToAdd;
    }

    user.test = true;
    await user.save();

    res.status(200).json({ success: true, message: 'Balance reloaded' });
  } catch (error) {
    console.error('Error reloading balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const setAlias = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pubkey = req.user?.pubkey;
    const { alias } = req.body;

    if (!pubkey) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (alias !== null && (typeof alias !== 'string' || alias.trim() === '')) {
      res.status(400).json({ error: 'Valid alias string or null is required' });
      return;
    }

    await connectDB();
    const user = await getOrCreateUser(pubkey);

    const targetAlias = alias === null ? null : alias.trim();

    if (targetAlias === null) {
      (user as any).alias = undefined; // Mongoose unsets undefined fields
    } else {
      (user as any).alias = targetAlias;
    }

    await user.save();

    res.status(200).json({ success: true, alias: targetAlias });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ error: 'Alias is already taken' });
    } else {
      console.error('Error setting alias:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export const getAlias = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pubkey } = req.params;
    if (!pubkey || typeof pubkey !== 'string') {
      res.status(400).json({ error: 'Missing pubkey' });
      return;
    }

    await connectDB();
    // Use getOrCreateUser which guarantees retrieving a user model, or just check DB directly.
    // If getting alias for ANY pubkey, we shouldn't create a user just to check.
    // We can import User or use `mongoose.model('User')`.
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    const user = await User.findOne({ pubkey });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ alias: user.alias || null });
  } catch (error) {
    console.error('Error fetching alias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
