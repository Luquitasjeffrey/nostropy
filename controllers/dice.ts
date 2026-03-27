import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import DiceGame from '../models/games/dice';
import Cryptocurrency from '../models/cryptocurrency';
import { updateUserBalance } from '../utils/user_balance';
import { generateServerSeed, generateGameSeed, GameSeed } from '../utils/game_seed';
import { connectDB } from '../utils/db';

const DICE_HOUSE_EDGE = Number(process.env.DICE_HOUSE_EDGE) || 0.01; // 1% default

export const newGame = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { playerPubkey, wagerAmount, currencySymbol = 'BTC', userNumber } = req.body;

    if (!playerPubkey || !wagerAmount || !userNumber) {
      res.status(400).json({ error: 'Missing wagerAmount, playerPubkey, or userNumber' });
      return;
    }

    if (userNumber < 2 || userNumber > 98) {
      res.status(400).json({ error: 'userNumber must be between 2 and 98' });
      return;
    }

    await connectDB();
    const user = req.user!;

    // Find Cryptocurrency
    const currency = await Cryptocurrency.findOne({ symbol: currencySymbol });
    if (!currency) {
      res.status(400).json({ error: `Currency ${currencySymbol} not supported` });
      return;
    }

    // Deduct Balance (Wager)
    try {
      await updateUserBalance(user._id as any, currency.symbol, -wagerAmount);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Insufficient balance' });
      return;
    }

    // Calculate Multiplier
    const winChance = 100 - userNumber;
    const multiplier = (100 / winChance) * (1 - DICE_HOUSE_EDGE);

    const serverSeed = generateServerSeed();

    const game = new DiceGame({
      user_id: user._id,
      currency_id: currency._id,
      wager_amount: wagerAmount,
      user_number: userNumber,
      multiplier: multiplier,
      status: 'WAITING_CLIENT_SEED',
      server_seed: serverSeed,
      payout: 0,
    });

    await game.save();
    res.status(201).json({ gameId: game._id, serverSeedHash: serverSeed.hash });
  } catch (error) {
    console.error('Error starting new dice game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const setClientSeed = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { playerPubkey, gameId, clientSeed } = req.body;

    if (!playerPubkey || !gameId || !clientSeed) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    await connectDB();
    const game = await DiceGame.findById(gameId);
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    if (game.user_id.toString() !== req.user?._id.toString()) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    if (game.status !== 'WAITING_CLIENT_SEED') {
      res.status(400).json({ error: 'Game not in a state to accept client seed' });
      return;
    }

    // Reveal game
    const serverSeedValue = game.server_seed.seed;
    const finalSeed = generateGameSeed(clientSeed, serverSeedValue);
    const rng = new GameSeed(finalSeed);

    // Roll calculation
    const rollNumber = rng.nextFloat();

    let status: 'WIN' | 'LOST' = 'LOST';
    let payout = 0;

    // Win condition: Roll >= User Target Number
    // (Based on the implementation plan, user wins if roll >= target)
    if (rollNumber >= game.user_number) {
      status = 'WIN';
      payout = Math.floor(game.wager_amount * game.multiplier);

      // Credit Winnings
      const currency = await Cryptocurrency.findById(game.currency_id);
      if (!currency) {
        throw new Error('Currency not found');
      }
      await updateUserBalance(game.user_id, currency.symbol, payout);
    }

    // Update Game Document
    game.client_seed = clientSeed;
    game.game_seed = finalSeed;
    game.roll_number = rollNumber;
    game.payout = payout;
    game.status = status === 'WIN' ? 'CASHED_OUT' : 'LOST';
    game.completed_at = new Date();

    await game.save();

    res.status(200).json({
      status,
      roll_number: rollNumber,
      payout,
      serverSeed: game.server_seed,
    });
  } catch (error) {
    console.error('Error revealing dice game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
