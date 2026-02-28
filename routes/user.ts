import express from 'express';
import { getBalance, getCurrencies } from '../controllers/user';

const router = express.Router();

router.get('/balance', getBalance);
router.get('/currencies', getCurrencies);

export default router;
