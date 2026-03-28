import express from 'express';
import { getBalance, getCurrencies, faucet, setAlias, getAlias } from '../controllers/user';
import { authenticatedUser } from '../middleware/auth';

const router = express.Router();

router.get('/balance', authenticatedUser, getBalance);
router.get('/currencies', getCurrencies);
router.post('/faucet', authenticatedUser, faucet);
router.post('/setalias', authenticatedUser, setAlias);
router.get('/getalias/:pubkey', getAlias);

export default router;
