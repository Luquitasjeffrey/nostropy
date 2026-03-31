import { Router } from 'express';
import { deposit, withdraw } from '../controllers/ln';
import { authenticatedUser } from '../middleware/auth';

const router = Router();

router.post('/deposit', authenticatedUser, deposit);
router.post('/withdraw', authenticatedUser, withdraw);

export default router;
