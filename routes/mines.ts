import { Router } from 'express';
import { newGame, setClientSeed, revealOne, cashOut } from '../controllers/mines';
import { injectUser } from '../middleware/auth';

const router = Router();

// Apply user injection to all routes
router.use(injectUser);

router.post('/new', newGame);
router.post('/set_client_seed', setClientSeed);
router.post('/reveal_one', revealOne);
router.post('/cash_out', cashOut);

export default router;
