import { Router } from 'express';
import { newGame, setClientSeed } from '../controllers/dice';
import { injectUser } from '../middleware/auth';

const router = Router();

// All dice routes require valid Nostr authentication
router.use(injectUser);

router.post('/new', newGame);
router.post('/set_client_seed', setClientSeed);

export default router;
