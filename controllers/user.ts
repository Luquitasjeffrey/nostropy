import { Request, Response } from 'express';
import { connectDB } from '../utils/db';
import { getOrCreateUser } from '../utils/user_balance';
import Cryptocurrency from '../models/cryptocurrency';

export const getBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pubkey } = req.query;

    if (!pubkey || typeof pubkey !== 'string') {
      res.status(400).json({ error: 'Missing pubkey query parameter' });
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
