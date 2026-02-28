import { Request, Response } from 'express';
import { connectDB } from '../utils/db';
import MinesGame from '../models/games/mines';
import { generateServerSeed, generateGameSeed, GameSeed } from '../utils/game_seed';

const MINES_HOUSE_EDGE = Number(process.env.MINES_HOUSE_EDGE) || 0.01; // 1% default

function getMultiplier(revealedCount: number, minesCount: number) {
    let multiplier = 1.0;
    for (let i = 0; i < revealedCount; i++) {
        multiplier *= (25 - i) / (25 - minesCount - i);
    }
    multiplier = multiplier * (1.0 - MINES_HOUSE_EDGE);
    return multiplier;
}

export const newGame = async (req: Request, res: Response): Promise<void> => {
    try {
        const { wagerAmount, playerPubkey, minesCount } = req.body;

        if (!wagerAmount || !playerPubkey || !minesCount) {
            res.status(400).json({ error: 'Missing wagerAmount or playerPubkey or minesCount' });
            return;
        }

        await connectDB();
        const serverSeed = generateServerSeed();

        const game = new MinesGame({
            player_pubkey: playerPubkey,
            wager_amount: wagerAmount,
            potentialPayout: wagerAmount,
            board_state: {
                cell_types: Array(25).fill('gem'),
                revealed_indices: [],
            },
            status: 'WAITING_CLIENT_SEED',
            server_seed: serverSeed,
            mines_count: minesCount,
        });

        await game.save();
        res.status(201).json({ gameId: game._id, serverSeedHash: serverSeed.hash });
    } catch (error) {
        console.error('Error starting new game:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const setClientSeed = async (req: Request, res: Response): Promise<void> => {
    try {
        const { playerPubkey, gameId, clientSeed } = req.body;

        if (!playerPubkey || !gameId || !clientSeed) {
            res.status(400).json({ error: 'Missing parameters' });
            return;
        }

        await connectDB();
        const game = await MinesGame.findById(gameId);
        if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
        if (game.player_pubkey !== playerPubkey) { res.status(403).json({ error: 'Unauthorized' }); return; }
        if (game.status !== 'WAITING_CLIENT_SEED') {
            res.status(400).json({ error: 'Game not in a state to accept client seed' });
            return;
        }

        const serverSeedValue = game.server_seed?.seed || '';
        const finalSeed = generateGameSeed(clientSeed, serverSeedValue);
        const rng = new GameSeed(finalSeed);

        const totalCells = game.board_state?.cell_types?.length || 25;
        const indices = Array.from({ length: totalCells }, (_, i) => i);
        const shuffled = rng.shuffle(indices);
        const bombs = new Set(shuffled.slice(0, game.mines_count));

        const cellTypes = Array(totalCells).fill('gem').map((_, idx) => (bombs.has(idx) ? 'bomb' : 'gem'));

        game.board_state = {
            cell_types: cellTypes,
            revealed_indices: [],
        };
        game.client_seed = clientSeed;
        game.current_multiplier = 1.0;
        game.status = 'ACTIVE';

        await game.save();
        res.status(200).json({ success: true, gameId: game._id });
    } catch (error) {
        console.error('Error setting client seed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const revealOne = async (req: Request, res: Response): Promise<void> => {
    try {
        const { playerPubkey, gameId, index } = req.body;

        if (!playerPubkey || !gameId || typeof index !== 'number') {
            res.status(400).json({ error: 'Missing parameters' });
            return;
        }

        await connectDB();
        const game = await MinesGame.findById(gameId);
        if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
        if (game.player_pubkey !== playerPubkey) { res.status(403).json({ error: 'Unauthorized' }); return; }
        if (game.status !== 'ACTIVE') { res.status(400).json({ error: 'Game not active' }); return; }

        if (game.board_state.revealed_indices.includes(index)) {
            res.status(400).json({ error: 'Cell already revealed' });
            return;
        }

        const cellType = game.board_state.cell_types[index];
        if (!cellType) {
            res.status(400).json({ error: 'Invalid cell index' });
            return;
        }

        if (cellType === 'bomb') {
            game.status = 'LOST';
            await game.save();
            res.status(200).json({ success: false, serverSeed: game.server_seed, board: game.board_state.cell_types });
            return;
        }

        game.board_state.revealed_indices.push(index);
        const newMultiplier = getMultiplier(game.board_state.revealed_indices.length, game.mines_count);
        game.current_multiplier = newMultiplier;

        await game.save();
        res.status(200).json({ success: true, newMultiplier });
    } catch (error) {
        console.error('Error revealing cell:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const cashOut = async (req: Request, res: Response): Promise<void> => {
    try {
        const { playerPubkey, gameId } = req.body;

        if (!playerPubkey || !gameId) {
            res.status(400).json({ error: 'Missing parameters' });
            return;
        }

        await connectDB();
        const game = await MinesGame.findById(gameId);
        if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
        if (game.player_pubkey !== playerPubkey) { res.status(403).json({ error: 'Unauthorized' }); return; }
        if (game.status !== 'ACTIVE') { res.status(400).json({ error: 'Game not active' }); return; }

        if (!game.board_state.revealed_indices || game.board_state.revealed_indices.length === 0) {
            res.status(400).json({ error: 'You must reveal at least one cell before cashing out' });
            return;
        }

        const payout = game.wager_amount * game.current_multiplier;
        game.status = 'CASHED_OUT';
        game.completed_at = new Date();
        await game.save();

        res.status(200).json({
            success: true,
            payout,
            board: game.board_state.cell_types,
            serverSeed: game.server_seed,
        });
    } catch (error) {
        console.error('Error cashing out:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
