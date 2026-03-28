import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getOrCreateUser } from '../utils/user_balance';
import { nip19, verifyEvent } from 'nostr-tools';

export const verify = async (req: Request, res: Response): Promise<void> => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ error: 'JWT_SECRET missing' });
      return;
    }

    const { event } = req.body;

    if (!event) {
      res.status(400).json({ error: 'The required event object is missing.' });
      return;
    }

    // 1. Verify Nostr signature
    const isValid = verifyEvent(event);
    if (!isValid) {
      res.status(401).json({ error: 'The provided signature is invalid.' });
      return;
    }

    // 2. Extract challenge tag
    const challengeTag = event.tags.find((t: string[]) => t[0] === 'challenge');
    if (!challengeTag) {
      res.status(400).json({ error: 'The challenge tag is missing from the event.' });
      return;
    }

    const challenge = challengeTag[1];

    // 3. Validate JWT challenge
    try {
      jwt.verify(challenge, jwtSecret);
    } catch (e) {
      res.status(401).json({ error: 'The challenge is either invalid or has expired.' });
      return;
    }

    // 4. Basic anti-replay verification
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - event.created_at) > 60) {
      res.status(401).json({ error: 'The event timestamp is outside the allowed range.' });
      return;
    }

    // 5. Fetch or create user
    const pubkey = nip19.npubEncode(event.pubkey);
    const user = await getOrCreateUser(pubkey);

    // 6. Generate session token
    const token = jwt.sign({ pubkey: user.pubkey }, jwtSecret, { expiresIn: '1h' });

    res.json({ token });
  } catch (error) {
    console.error('Error in verify:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const challenge = (req: Request, res: Response): void => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET is not defined');
    res.status(500).json({ error: 'Internal server error: JWT_SECRET missing' });
    return;
  }

  const challenge = jwt.sign(
    {
      nonce: crypto.randomUUID(),
    },
    jwtSecret,
    {
      expiresIn: '5m',
    }
  );

  res.json({ challenge });
};
