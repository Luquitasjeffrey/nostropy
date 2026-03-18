import express from 'express';
import { newGame, setClientSeed, hit, stand, doubledown, split } from '../controllers/blackjack';
import { injectUser } from '../middleware/auth';

const router = express.Router();

router.use(injectUser);

// Same pattern as dice/mines
router.post('/newgame', newGame);
router.post('/set_client_seed', setClientSeed);

// Blackjack specific actions
router.post('/hit', hit);
router.post('/stand', stand);
router.post('/doubledown', doubledown);
router.post('/split', split);

export default router;
