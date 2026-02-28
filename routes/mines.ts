import { Router } from 'express';
import { newGame, setClientSeed, revealOne, cashOut } from '../controllers/mines';

const router = Router();

router.post('/new', newGame);
router.post('/set_client_seed', setClientSeed);
router.post('/reveal_one', revealOne);
router.post('/cash_out', cashOut);

export default router;
