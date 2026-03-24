import express from 'express';
import { createSession } from '../controllers/auth';

const router = express.Router();

router.post('/', createSession);

export default router;
