import { Schema } from 'mongoose';
import { Game, IGame } from './base';

export interface ICard {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
  isHidden: boolean;
}

export interface IPlayerHand {
  cards: ICard[];
  bet: number;
  isFinished: boolean; // True if stood, busted, or blackjack
  doubleDown: boolean;
  winAmount: number; // calculated at the end
}

export interface IBlackjackGame extends IGame {
  // 'WAITING_CLIENT_SEED': wager placed, waiting for seed
  // 'ACTIVE': game in progress
  // 'CASHED_OUT': game over, payouts resolved
  status: 'WAITING_CLIENT_SEED' | 'ACTIVE' | 'CASHED_OUT';

  player_hands: IPlayerHand[];
  dealer_hand: ICard[];

  active_hand_index: number; // which hand the player is currently playing
  cards_drawn: number; // how many cards have been drawn from the rng so far
}

const CardSchema = new Schema<ICard>(
  {
    suit: { type: String, enum: ['hearts', 'diamonds', 'clubs', 'spades'], required: true },
    rank: {
      type: String,
      enum: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'],
      required: true,
    },
    isHidden: { type: Boolean, default: false },
  },
  { _id: false }
);

const PlayerHandSchema = new Schema<IPlayerHand>(
  {
    cards: [CardSchema],
    bet: { type: Number, required: true, min: 0 },
    isFinished: { type: Boolean, default: false },
    doubleDown: { type: Boolean, default: false },
    winAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

const BlackjackGameSchema = new Schema<IBlackjackGame>({
  status: {
    type: String,
    enum: ['WAITING_CLIENT_SEED', 'ACTIVE', 'CASHED_OUT'],
    default: 'WAITING_CLIENT_SEED',
  },
  player_hands: {
    type: [PlayerHandSchema],
    default: [],
  },
  dealer_hand: {
    type: [CardSchema],
    default: [],
  },
  active_hand_index: {
    type: Number,
    default: 0,
  },
  cards_drawn: {
    type: Number,
    default: 0,
  },
});

const BlackjackGame =
  Game.discriminators?.Blackjack ||
  Game.discriminator<IBlackjackGame>('Blackjack', BlackjackGameSchema);

export default BlackjackGame;
