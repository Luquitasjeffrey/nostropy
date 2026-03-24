import { Router } from 'express';
import { newGame, setClientSeed } from '../controllers/fork';
import { injectUser } from '../middleware/auth';

const router = Router();

// All fork routes require valid Nostr authentication
router.use(injectUser);

router.post('/new_game', newGame);
router.post('/set_client_seed', setClientSeed);

export default router;
