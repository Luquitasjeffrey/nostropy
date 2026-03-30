import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { broadcast } from '../utils/websocket';
import User from '../models/user';
import { verifyEvent, nip19 } from 'nostr-tools';

export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { event } = req.body;

    if (!event) {
      res.status(400).json({ error: 'Missing Nostr event' });
      return;
    }

    // Verify the Nostr event
    const isValid = verifyEvent(event);
    if (!isValid) {
      res.status(400).json({ error: 'Invalid Nostr event signature' });
      return;
    }

    const npub = nip19.npubEncode(event.pubkey);

    // Ensure the event pubkey matches the authenticated user's pubkey
    if (npub !== req.user?.pubkey) {
      res.status(403).json({ error: 'Event pubkey mismatch' });
      return;
    }

    // Broadcast the message
    broadcast({
      type: 'message',
      from: req.user?.alias ? `@${req.user.alias}` : 'Anonymous',
      content: event.content
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
