import { useCallback } from 'react';
import { type CardState, type Suit, type Rank } from '../blackjack/Card';

export interface BaccaratBets {
    player: number;
    banker: number;
    tie: number;
}

export interface BaccaratResult {
    winner: 'player' | 'banker' | 'tie';
    playerHand: CardState[];
    bankerHand: CardState[];
    playerScore: number;
    bankerScore: number;
    payout: number; // Multiplier of the total bet (or specific payouts)
    winAmountUsd: number;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function getCardValue(rank: Rank): number {
    if (['10', 'J', 'Q', 'K'].includes(rank)) return 0;
    if (rank === 'A') return 1;
    return parseInt(rank);
}

function calculateScore(cards: CardState[]): number {
    const sum = cards.reduce((acc, card) => acc + getCardValue(card.rank!), 0);
    return sum % 10;
}

export function useBaccaratEngine() {
    const deal = useCallback((bets: BaccaratBets, _currencySymbol: string, _prices: Record<string, number>): BaccaratResult => {
        // 1. Create and shuffle 8-deck shoe
        const shoe: CardState[] = [];
        for (let deck = 0; deck < 8; deck++) {
            for (const suit of SUITS) {
                for (const rank of RANKS) {
                    shoe.push({ suit, rank, isHidden: false });
                }
            }
        }

        // Fisher-Yates shuffle
        for (let i = shoe.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
        }

        let shoeIdx = 0;
        const draw = () => shoe[shoeIdx++];

        // 2. Initial deal: P1, B1, P2, B2
        const playerHand: CardState[] = [draw()];
        const bankerHand: CardState[] = [draw()];
        playerHand.push(draw());
        bankerHand.push(draw());

        let playerScore = calculateScore(playerHand);
        let bankerScore = calculateScore(bankerHand);

        // 3. Natural check
        const isNatural = playerScore >= 8 || bankerScore >= 8;

        if (!isNatural) {
            // 4. Player third-card rule
            let playerThirdCardValue: number | null = null;
            if (playerScore <= 5) {
                const thirdCard = draw();
                playerHand.push(thirdCard);
                playerThirdCardValue = getCardValue(thirdCard.rank!);
                playerScore = calculateScore(playerHand);
            }

            // 5. Banker third-card rule
            let bankerDraws = false;
            if (playerThirdCardValue === null) {
                // Player didn't draw
                if (bankerScore <= 5) bankerDraws = true;
            } else {
                // Player drew a third card
                const p3 = playerThirdCardValue;
                if (bankerScore <= 2) bankerDraws = true;
                else if (bankerScore === 3 && p3 !== 8) bankerDraws = true;
                else if (bankerScore === 4 && [2, 3, 4, 5, 6, 7].includes(p3)) bankerDraws = true;
                else if (bankerScore === 5 && [4, 5, 6, 7].includes(p3)) bankerDraws = true;
                else if (bankerScore === 6 && [6, 7].includes(p3)) bankerDraws = true;
            }

            if (bankerDraws) {
                bankerHand.push(draw());
                bankerScore = calculateScore(bankerHand);
            }
        }

        // 6. Determine winner
        let winner: 'player' | 'banker' | 'tie';
        if (playerScore > bankerScore) winner = 'player';
        else if (bankerScore > playerScore) winner = 'banker';
        else winner = 'tie';

        // 7. Calculate payout (USD)
        // const _price = prices[currencySymbol] || 1;
        let winAmountUsd = 0;

        // Player bet
        if (winner === 'player') {
            winAmountUsd += bets.player; // 1:1 profit
            winAmountUsd -= bets.banker; // loss
            winAmountUsd -= bets.tie;    // loss
        }
        // Banker bet
        else if (winner === 'banker') {
            winAmountUsd += bets.banker * 0.95; // 0.95:1 profit (5% commission)
            winAmountUsd -= bets.player;        // loss
            winAmountUsd -= bets.tie;           // loss
        }
        // Tie bet
        else {
            winAmountUsd += bets.tie * 8;       // 8:1 profit
            // Player and Banker bets PUSH (no change)
        }

        return {
            winner,
            playerHand,
            bankerHand,
            playerScore,
            bankerScore,
            payout: winAmountUsd, // This is net profit, but let's keep it as total win if needed
            winAmountUsd
        };
    }, []);

    return { deal };
}
