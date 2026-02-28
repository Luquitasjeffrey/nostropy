import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { getOrCreateUser } from '../utils/user_balance';

export const injectUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const playerPubkey = req.body?.playerPubkey || req.query?.playerPubkey;

        if (!playerPubkey || typeof playerPubkey !== 'string') {
            res.status(400).json({ error: 'Missing playerPubkey' });
            return;
        }

        const user = await getOrCreateUser(playerPubkey);
        req.user = user;
        next();
    } catch (error) {
        console.error('Error in injectUser middleware:', error);
        res.status(500).json({ error: 'Internal server error during user authentication' });
    }
};
