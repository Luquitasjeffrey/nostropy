import { Schema } from 'mongoose';
import { Game, IGame } from './base';

export interface IForkGame extends IGame {
    status: 'WAITING_CLIENT_SEED' | 'WIN' | 'LOST';
    hashrate: number;     // [5, 95] - player hashrate percentage
    target_blocks: number; // [2, 12] - blocks needed to win
    multiplier: number;
    block_orders: string[]; // ['player' | 'house', ...]
    roll_numbers: number[]; // raw RNG floats
}

const ForkGameSchema = new Schema<IForkGame>(
    {
        hashrate: {
            type: Number,
            required: true,
            min: 5,
            max: 95,
        },
        target_blocks: {
            type: Number,
            required: true,
            min: 2,
            max: 12,
        },
        multiplier: {
            type: Number,
            required: true,
            min: 1,
        },
        block_orders: {
            type: [String],
            default: [],
        },
        roll_numbers: {
            type: [Number],
            default: [],
        },
        status: {
            type: String,
            enum: ['WAITING_CLIENT_SEED', 'WIN', 'LOST'],
            default: 'WAITING_CLIENT_SEED',
        },
    }
);

const ForkGame =
    Game.discriminators?.Fork ||
    Game.discriminator<IForkGame>('Fork', ForkGameSchema);

export default ForkGame;
