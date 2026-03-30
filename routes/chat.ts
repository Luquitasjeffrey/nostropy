import { Router } from 'express';
import { sendMessage } from '../controllers/chat';
import { authenticatedUser } from '../middleware/auth';

const router = Router();

// /api/chat/send
router.post('/send', authenticatedUser, sendMessage);

export default router;
