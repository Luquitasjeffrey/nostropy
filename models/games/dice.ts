import { Schema } from 'mongoose';
import { Game, IGame } from './base';

/**
 * Mines Game State Model
 *
 * Represents a single Mines game session.
 * Grid: 5x5 = 25 cells
 * Mines count: configurable (typically 1-24, default 5)
 * Gems: remaining cells after placing mines
 */

export interface IDiceGame extends IGame {
  // Game status
  // 'LOST': hit a bomb, game over
  // 'CASHED_OUT': player called cashout, game over with winnings
  // 'WAITING_CLIENT_SEED': game session created but no client seed yet
  status: 'WAITING_CLIENT_SEED' | 'LOST' | 'CASHED_OUT';

  user_number: number; // [1.0,99.0] // roll number should be below this for user to win
  multiplier: number; // [1.0,99.0] (100/(100-user_number)) * (1-HOUSE_EDGE)
  roll_number: number; // [0.0,100.0)

  // Nostr event reference (if published)
  nostr_event_id?: string;
}

const DiceGameSchema = new Schema<IDiceGame>({
  user_number: {
    type: Number,
    min: 1,
    max: 99,
  },
  roll_number: {
    type: Number,
    min: 0,
    max: 100,
  },
  multiplier: {
    type: Number,
    min: 1.0,
  },
  status: {
    type: String,
    enum: ['WAITING_CLIENT_SEED', 'LOST', 'CASHED_OUT'],
    default: 'WAITING_CLIENT_SEED',
  },
  nostr_event_id: String,
});

// Prevent overwriting the model if it already exists
const DiceGame = Game.discriminators?.Dice || Game.discriminator<IDiceGame>('Dice', DiceGameSchema);

export default DiceGame;
