import express from 'express';
import { challenge, verify } from '../controllers/auth';

const router = express.Router();

router.get('/challenge', challenge);
router.post('/verify', verify);

export default router;
