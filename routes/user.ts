import express from 'express';
import { getBalance, getCurrencies, faucet } from '../controllers/user';
import { authenticatedUser } from '../middleware/auth';

const router = express.Router();

router.get('/balance', authenticatedUser, getBalance);
router.get('/currencies', getCurrencies);
router.post('/faucet', authenticatedUser, faucet);

export default router;
