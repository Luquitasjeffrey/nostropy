import { Router } from 'express';
import { newGame, setClientSeed } from '../controllers/fork';
import { authenticatedUser } from '../middleware/auth';

const router = Router();

// All fork routes require valid Nostr authentication
router.use(authenticatedUser);

router.post('/new_game', newGame);
router.post('/set_client_seed', setClientSeed);

export default router;
