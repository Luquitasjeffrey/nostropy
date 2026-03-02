import mongoose, { Schema } from 'mongoose';
import { Game, IGame } from './base';

/**
 * Mines Game State Model
 *
 * Represents a single Mines game session.
 * Grid: 5x5 = 25 cells
 * Mines count: configurable (typically 1-24, default 5)
 * Gems: remaining cells after placing mines
 */

export interface IMinesGame extends IGame {
  mines_count: number; // number of bombs on board

  // Game metrics
  current_multiplier: number; // starts at 1.0, increases per gem revealed

  // Game status
  // 'ACTIVE': game in progress, playable
  // 'LOST': hit a bomb, game over
  // 'CASHED_OUT': player called cashout, game over with winnings
  // 'WAITING_CLIENT_SEED': game session created but no client seed yet
  // 'CANCELED': game canceled before starting (e.g. expired without client seed)
  status: 'WAITING_CLIENT_SEED' | 'CANCELED' | 'ACTIVE' | 'LOST' | 'CASHED_OUT';

  // Board state
  board_state: {
    // Array of 25 cells, each can be 'gem' or 'bomb'
    cell_types: ('gem' | 'bomb')[];
    // Array of revealed cell indices
    revealed_indices: number[];
  };

  // Nostr event reference (if published)
  nostr_event_id?: string;
}

const MinesGameSchema = new Schema<IMinesGame>(
  {
    mines_count: {
      type: Number,
      default: 5,
      min: 1,
      max: 24,
    },
    board_state: {
      cell_types: {
        type: [String],
        required: true,
        validate: {
          validator: (arr: string[]) => arr.length === 25,
          message: '5x5 grid must have exactly 25 cells',
        },
      },
      revealed_indices: {
        type: [Number],
        default: [],
      },
    },
    current_multiplier: {
      type: Number,
      default: 1.0,
      min: 1.0,
    },
    status: {
      type: String,
      enum: ['WAITING_CLIENT_SEED', 'CANCELED', 'ACTIVE', 'LOST', 'CASHED_OUT'],
      default: 'WAITING_CLIENT_SEED',
    },
    nostr_event_id: String,
  }
);

// Prevent overwriting the model if it already exists
const MinesGame =
  Game.discriminators?.Mines ||
  Game.discriminator<IMinesGame>('Mines', MinesGameSchema);

export default MinesGame;
