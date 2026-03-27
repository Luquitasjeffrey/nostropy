import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getOrCreateUser } from '../utils/user_balance';

export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pubkey } = req.body;
    if (!pubkey || typeof pubkey !== 'string') {
      res.status(400).json({ error: 'Missing pubkey' });
      return;
    }

    const user = await getOrCreateUser(pubkey);

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined');
      res.status(500).json({ error: 'Internal server error: JWT_SECRET missing' });
      return;
    }

    const token = jwt.sign({ pubkey: user.pubkey }, jwtSecret, { expiresIn: '7d' });

    res.status(200).json({ token, user: { pubkey: user.pubkey } });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
