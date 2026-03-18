import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { connectDB } from '../utils/db';
import BlackjackGame, { ICard, IPlayerHand } from '../models/games/blackjack';
import { Game } from '../models/games/base';
import Cryptocurrency from '../models/cryptocurrency';
import { generateServerSeed, generateGameSeed, GameSeed } from '../utils/game_seed';
import { updateUserBalance } from '../utils/user_balance';

const SUITS: ICard['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: ICard['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Deterministically draw a card using the rng and incrementing the offset
function drawCard(seed: string, offset: number, isHidden = false): ICard {
    // We use the RNG to generate a float for the suit and another for the rank,
    // but to keep it deterministic to the index 'offset', we could seed a new GameSeed or leapfrog.
    // GameSeed nextFloat() gives sequentially deterministic numbers from the seed.
    // Since we need to be able to "resume" drawing from an offset, we will skip 'offset' numbers.

    // NOTE: A more robust approach if offset can be large is to instantiate GameSeed with
    // `${finalSeed}:${offset}`, but looping nextFloat is fine for the small number of cards in BJ.

    const rng = new GameSeed(seed);
    // Each card needs 2 random numbers (suit and rank), so multiply offset by 2 to prevent overlapping nonces
    rng.setNonce(offset * 2);

    // nextFloat() returns [0, 100), so divide by 100 to get [0, 1)
    const suitRatio = rng.nextFloat() / 100;
    const rankRatio = rng.nextFloat() / 100;

    const suit = SUITS[Math.floor(suitRatio * SUITS.length)];
    const rank = RANKS[Math.floor(rankRatio * RANKS.length)];

    return { suit, rank, isHidden };
}

function getCardValue(rank: ICard['rank']): number {
    if (['J', 'Q', 'K'].includes(rank)) return 10;
    if (rank === 'A') return 11;
    return parseInt(rank);
}

function getHandDetails(cards: ICard[]) {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
        if (!card.isHidden) {
            if (card.rank === 'A') aces += 1;
            total += getCardValue(card.rank);
        }
    }

    let isSoft = false;
    while (total > 21 && aces > 0) {
        total -= 10;
        aces -= 1;
    }
    if (aces > 0 && total <= 21) {
        isSoft = true;
    }

    const isBlackjack = cards.length === 2 && total === 21;
    return { value: total, isSoft, isBlackjack, isBust: total > 21 };
}

// Helper to mask hidden cards before sending to the client
function sanitizeDealerHand(dealerHand: ICard[]) {
    return dealerHand.map(card => {
        if (card.isHidden) {
            return { suit: 'hidden', rank: 'hidden', isHidden: true };
        }
        return card;
    });
}

export const newGame = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { wagerAmount, playerPubkey, currencySymbol = 'BTC' } = req.body;

        if (!wagerAmount || !playerPubkey) {
            res.status(400).json({ error: 'Missing wagerAmount or playerPubkey' });
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

        const serverSeed = generateServerSeed();

        const game = new BlackjackGame({
            user_id: user._id,
            currency_id: currency._id,
            wager_amount: wagerAmount,
            status: 'WAITING_CLIENT_SEED',
            server_seed: serverSeed,
            player_hands: [],
            dealer_hand: [],
            active_hand_index: 0,
            cards_drawn: 0,
        });

        await game.save();
        res.status(201).json({ gameId: game._id, serverSeedHash: serverSeed.hash });
    } catch (error) {
        console.error('Error starting new blackjack game:', error);
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
        const game = await Game.findById(gameId).populate('currency_id') as any;
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

        const serverSeedValue = game.server_seed.seed;
        const finalSeed = generateGameSeed(clientSeed, serverSeedValue);

        let cardsDrawn = 0;
        const pCard1 = drawCard(finalSeed, cardsDrawn++);
        const pCard2 = drawCard(finalSeed, cardsDrawn++);
        const dCard1 = drawCard(finalSeed, cardsDrawn++, true); // Hidden hole card
        const dCard2 = drawCard(finalSeed, cardsDrawn++);

        game.client_seed = clientSeed;
        game.game_seed = finalSeed;
        game.cards_drawn = cardsDrawn;
        game.dealer_hand = [dCard1, dCard2];
        game.player_hands = [{
            cards: [pCard1, pCard2],
            bet: game.wager_amount,
            isFinished: false,
            doubleDown: false,
            winAmount: 0,
        }];

        game.status = 'ACTIVE';

        const pDetails = getHandDetails(game.player_hands[0].cards);

        // Check instant blackjack
        if (pDetails.isBlackjack) {
            await resolveGameMechanics(game, finalSeed);
        } else {
            await game.save();
        }

        res.status(200).json({
            success: true,
            gameId: game._id,
            player_hands: game.player_hands,
            dealer_hand: sanitizeDealerHand(game.dealer_hand),
            status: game.status,
            cards_drawn: game.cards_drawn,
            ...(game.status === 'CASHED_OUT' ? { serverSeed: game.server_seed } : {})
        });
    } catch (error) {
        console.error('Error setting client seed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const hit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { playerPubkey, gameId } = req.body;
        await connectDB();
        const game = await Game.findById(gameId).populate('currency_id') as any;
        if (!game || game.status !== 'ACTIVE' || game.user_id.toString() !== req.user?._id.toString()) {
            res.status(400).json({ error: 'Invalid game state or unauthorized' });
            return;
        }

        const activeHand = game.player_hands[game.active_hand_index];
        if (activeHand.isFinished) {
            res.status(400).json({ error: 'Hand already finished' });
            return;
        }

        const newCard = drawCard(game.game_seed!, game.cards_drawn++);
        activeHand.cards.push(newCard);

        const details = getHandDetails(activeHand.cards);
        if (details.isBust || details.value === 21) {
            activeHand.isFinished = true;
        }

        if (activeHand.isFinished) {
            await tryAdvanceHandOrResolve(game, game.game_seed!);
        } else {
            await game.save();
        }

        res.status(200).json({
            success: true,
            player_hands: game.player_hands,
            dealer_hand: sanitizeDealerHand(game.dealer_hand),
            active_hand_index: game.active_hand_index,
            status: game.status,
            ...(game.status === 'CASHED_OUT' ? { serverSeed: game.server_seed } : {})
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const stand = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { playerPubkey, gameId } = req.body;
        await connectDB();
        const game = await Game.findById(gameId).populate('currency_id') as any;
        if (!game || game.status !== 'ACTIVE' || game.user_id.toString() !== req.user?._id.toString()) {
            res.status(400).json({ error: 'Invalid game state or unauthorized' });
            return;
        }

        const activeHand = game.player_hands[game.active_hand_index];
        if (activeHand.isFinished) {
            res.status(400).json({ error: 'Hand already finished' });
            return;
        }

        activeHand.isFinished = true;
        await tryAdvanceHandOrResolve(game, game.game_seed!);

        res.status(200).json({
            success: true,
            player_hands: game.player_hands,
            dealer_hand: sanitizeDealerHand(game.dealer_hand),
            active_hand_index: game.active_hand_index,
            status: game.status,
            ...(game.status === 'CASHED_OUT' ? { serverSeed: game.server_seed } : {})
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const doubledown = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { playerPubkey, gameId } = req.body;
        await connectDB();
        const game = await Game.findById(gameId).populate('currency_id') as any;
        if (!game || game.status !== 'ACTIVE' || game.user_id.toString() !== req.user?._id.toString()) {
            res.status(400).json({ error: 'Invalid game state or unauthorized' });
            return;
        }

        const activeHand = game.player_hands[game.active_hand_index];
        if (activeHand.isFinished || activeHand.cards.length !== 2) {
            res.status(400).json({ error: 'Cannot double down now' });
            return;
        }

        const currency = game.currency_id as any;
        try {
            await updateUserBalance(game.user_id as any, currency.symbol, -activeHand.bet);
        } catch (err: any) {
            res.status(400).json({ error: err.message || 'Insufficient balance to double down' });
            return;
        }

        activeHand.bet *= 2;
        game.wager_amount += (activeHand.bet / 2); // updating total wager
        activeHand.doubleDown = true;

        const newCard = drawCard(game.game_seed!, game.cards_drawn++);
        activeHand.cards.push(newCard);
        activeHand.isFinished = true;

        await tryAdvanceHandOrResolve(game, game.game_seed!);

        res.status(200).json({
            success: true,
            player_hands: game.player_hands,
            dealer_hand: sanitizeDealerHand(game.dealer_hand),
            active_hand_index: game.active_hand_index,
            status: game.status,
            ...(game.status === 'CASHED_OUT' ? { serverSeed: game.server_seed } : {})
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const split = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { playerPubkey, gameId } = req.body;
        await connectDB();
        const game = await Game.findById(gameId).populate('currency_id') as any;
        if (!game || game.status !== 'ACTIVE' || game.user_id.toString() !== req.user?._id.toString()) {
            res.status(400).json({ error: 'Invalid game state or unauthorized' });
            return;
        }

        if (game.player_hands.length > 1) {
            res.status(400).json({ error: 'Already split once' });
            return;
        }

        const activeHand = game.player_hands[game.active_hand_index];
        if (activeHand.isFinished || activeHand.cards.length !== 2) {
            res.status(400).json({ error: 'Cannot split now' });
            return;
        }

        if (activeHand.cards[0].rank !== activeHand.cards[1].rank || activeHand.cards[0].rank === 'A') {
            res.status(400).json({ error: 'Invalid split cards' });
            return;
        }

        const currency = game.currency_id as any;
        try {
            await updateUserBalance(game.user_id as any, currency.symbol, -activeHand.bet);
        } catch (err: any) {
            res.status(400).json({ error: err.message || 'Insufficient balance to split' });
            return;
        }

        game.wager_amount += activeHand.bet; // updating total wager

        const card2 = activeHand.cards.pop()!;

        const newCard1 = drawCard(game.game_seed!, game.cards_drawn++);
        const newCard2 = drawCard(game.game_seed!, game.cards_drawn++);

        activeHand.cards.push(newCard1);

        game.player_hands.push({
            cards: [card2, newCard2],
            bet: activeHand.bet,
            isFinished: false,
            doubleDown: false,
            winAmount: 0,
        });

        await game.save();

        res.status(200).json({
            success: true,
            player_hands: game.player_hands,
            dealer_hand: sanitizeDealerHand(game.dealer_hand),
            active_hand_index: game.active_hand_index,
            status: game.status,
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Helper to check if next hand should be played, or if dealer should go
async function tryAdvanceHandOrResolve(game: any, seed: string) {
    if (game.active_hand_index + 1 < game.player_hands.length) {
        game.active_hand_index += 1;
        await game.save();
    } else {
        await resolveGameMechanics(game, seed);
    }
}

// Helper to play out the dealer and resolve payouts
async function resolveGameMechanics(game: any, seed: string) {
    // Reveal dealer hole card
    if (game.dealer_hand[0]) {
        game.dealer_hand[0].isHidden = false;
    }

    let needsToDraw = false;
    for (const hand of game.player_hands) {
        const det = getHandDetails(hand.cards);
        if (!det.isBust && !det.isBlackjack) {
            needsToDraw = true;
        }
    }

    while (needsToDraw) {
        const details = getHandDetails(game.dealer_hand);
        if (details.value < 17 || (details.value === 17 && details.isSoft)) {
            const newCard = drawCard(seed, game.cards_drawn++);
            game.dealer_hand.push(newCard);
        } else {
            break;
        }
    }

    const dealerDetails = getHandDetails(game.dealer_hand);
    let totalPayout = 0;

    for (let i = 0; i < game.player_hands.length; i++) {
        const hand = game.player_hands[i];
        const pDetails = getHandDetails(hand.cards);
        let winAmt = 0;

        if (pDetails.isBust) {
            winAmt = -hand.bet;
        } else if (pDetails.isBlackjack) {
            if (dealerDetails.isBlackjack) {
                winAmt = hand.bet; // Push -> original bet back
            } else {
                winAmt = hand.bet + (hand.bet * 1.5); // 3:2 payout (bet + winnings)
            }
        } else if (dealerDetails.isBust) {
            winAmt = hand.bet * 2; // win 1:1 (bet + winnings)
        } else if (pDetails.value > dealerDetails.value) {
            winAmt = hand.bet * 2; // win 1:1
        } else if (pDetails.value < dealerDetails.value) {
            winAmt = -hand.bet; // lose
        } else {
            winAmt = hand.bet; // Push -> original bet back
        }

        hand.winAmount = winAmt > 0 ? winAmt - hand.bet : winAmt; // logical win for UI purposes
        if (winAmt > 0) {
            totalPayout += winAmt;
        }
    }

    game.status = 'CASHED_OUT';
    game.payout = totalPayout;
    game.completed_at = new Date();

    if (totalPayout > 0) {
        const currency = game.currency_id as any;
        await updateUserBalance(game.user_id, currency.symbol, totalPayout);
    }

    await game.save();
}
