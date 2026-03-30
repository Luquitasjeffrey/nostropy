import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import ForkGame from '../models/games/fork';
import Cryptocurrency from '../models/cryptocurrency';
import { updateUserBalance } from '../utils/user_balance';
import { generateServerSeed, generateGameSeed, GameSeed } from '../utils/game_seed';
import { connectDB } from '../utils/db';
import { broadcast } from '../utils/websocket';
import User from '../models/user';

const FORK_HOUSE_EDGE = Number(process.env.FORK_HOUSE_EDGE) || 0.02;

const binomial = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  if (k > n / 2) k = n - k;
  let res = 1;
  for (let i = 1; i <= k; i++) {
    res = (res * (n - i + 1)) / i;
  }
  return res;
};

const calcWinProb = (q: number, z: number): number => {
  let sum = 0;
  for (let k = 0; k < z; k++) {
    const comb = binomial(z - 1 + k, k);
    sum += comb * Math.pow(q, z) * Math.pow(1 - q, k);
  }
  return sum;
};

export const newGame = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { playerPubkey, wagerAmount, currencySymbol = 'BTC', targetBlocks, hashrate } = req.body;

    if (!playerPubkey || !wagerAmount || !targetBlocks || !hashrate) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    if (targetBlocks < 2 || targetBlocks > 12) {
      res.status(400).json({ error: 'targetBlocks must be between 2 and 12' });
      return;
    }

    if (hashrate < 5 || hashrate > 95) {
      res.status(400).json({ error: 'hashrate must be between 5 and 95' });
      return;
    }

    await connectDB();
    const user = req.user!;

    const currency = await Cryptocurrency.findOne({ symbol: currencySymbol });
    if (!currency) {
      res.status(400).json({ error: `Currency ${currencySymbol} not supported` });
      return;
    }

    try {
      await updateUserBalance(user._id as any, currency.symbol, -wagerAmount);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Insufficient balance' });
      return;
    }

    const q = hashrate / 100;
    const z = targetBlocks;
    const winProb = calcWinProb(q, z);
    const multiplier = (1 / winProb) * (1 - FORK_HOUSE_EDGE);

    console.log(
      `[Fork] NEW GAME: wager=${wagerAmount}, q=${q}, z=${z}, winProb=${winProb.toFixed(6)}, mult=${multiplier.toFixed(4)}`
    );

    const serverSeed = generateServerSeed();

    const game = new ForkGame({
      user_id: user._id,
      currency_id: currency._id,
      wager_amount: wagerAmount,
      target_blocks: targetBlocks,
      hashrate: hashrate,
      multiplier: multiplier,
      status: 'WAITING_CLIENT_SEED',
      server_seed: serverSeed,
      payout: 0,
    });

    await game.save();
    res.status(201).json({ gameId: game._id, serverSeedHash: serverSeed.hash });
  } catch (error) {
    console.error('Error starting new fork game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const setClientSeed = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { gameId, clientSeed } = req.body;

    if (!gameId || !clientSeed) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    await connectDB();
    const game = await ForkGame.findById(gameId);
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    if (game.user_id.toString() !== req.user?._id.toString()) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    if (game.status !== 'WAITING_CLIENT_SEED') {
      res.status(400).json({ error: 'Game already finished' });
      return;
    }

    const serverSeedValue = game.server_seed.seed;
    const finalSeed = generateGameSeed(clientSeed, serverSeedValue);
    const rng = new GameSeed(finalSeed);

    const blockOrders: string[] = [];
    const rollNumbers: number[] = [];
    let playerBlocks = 0;
    let houseBlocks = 0;
    const target = game.target_blocks;
    const hashrate = game.hashrate;

    while (playerBlocks < target && houseBlocks < target) {
      const roll = rng.nextFloat();
      rollNumbers.push(roll);
      if (roll < hashrate) {
        playerBlocks++;
        blockOrders.push('player');
      } else {
        houseBlocks++;
        blockOrders.push('house');
      }
    }

    const isWin = playerBlocks >= target;
    const status = isWin ? 'WIN' : 'LOST';
    const payout = isWin ? Math.floor(game.wager_amount * game.multiplier) : 0;

    console.log(
      `[Fork] REVEAL: gameId=${gameId}, win=${isWin}, player=${playerBlocks}, house=${houseBlocks}, rolls=${rollNumbers.length}`
    );

    if (isWin) {
      const currency = await Cryptocurrency.findById(game.currency_id);
      if (currency) {
        await updateUserBalance(game.user_id, currency.symbol, payout);
      }
    }

    game.client_seed = clientSeed;
    game.game_seed = finalSeed;
    game.block_orders = blockOrders;
    game.roll_numbers = rollNumbers;
    game.payout = payout;
    game.status = status;
    game.completed_at = new Date();

    await game.save();

    // Broadcast results
    try {
      const user = await User.findById(game.user_id);
      const currency = await Cryptocurrency.findById(game.currency_id);
      if (user && currency) {
        const netPayout = game.payout - game.wager_amount;
        const amountFloat = Math.abs(netPayout) / Math.pow(10, currency.decimal_places);

        broadcast({
          type: 'bet',
          from: user.alias ? `@${user.alias}` : user.pubkey,
          content: {
            payout: netPayout,
            fiatCode: currency.symbol === 'BTC' ? 'USD' : currency.symbol,
            bitcoinAmount: amountFloat,
            game: 'Fork'
          }
        });
      }
    } catch (err) {
      console.error('Error broadcasting result:', err);
    }

    res.status(200).json({
      status,
      payout,
      serverSeed: game.server_seed.seed,
      blockOrders,
    });
  } catch (error) {
    console.error('Error revealing fork game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
