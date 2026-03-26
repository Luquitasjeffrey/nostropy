import express from 'express';
import { getBalance, getCurrencies } from '../controllers/user';
import { authenticatedUser } from '../middleware/auth';

const router = express.Router();

router.get('/balance', authenticatedUser, getBalance);
router.get('/currencies', getCurrencies);

export default router;
