import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
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

export const authenticatedUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
            return;
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({ error: 'Unauthorized: Missing token' });
            return;
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('JWT_SECRET is not defined');
            res.status(500).json({ error: 'Internal server error: JWT_SECRET missing' });
            return;
        }

        const decoded = jwt.verify(token, secret) as { pubkey: string };

        if (!decoded || !decoded.pubkey) {
            res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
            return;
        }

        const user = await getOrCreateUser(decoded.pubkey);
        req.user = user;

        next();
    } catch (error) {
        console.error('Error in authenticatedUser middleware:', error);
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
