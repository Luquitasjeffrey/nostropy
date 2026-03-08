import { useState, useEffect } from 'react';
import { Card, type Suit, type Rank, type CardState } from './blackjack/Card';
import { Chip, type ChipDenomination } from './blackjack/Chip';

interface BlackjackPageProps {
    playerPubkey: string;
    allBalances: any[];
    prices: Record<string, number>;
    onGameEnd: () => void;
}

type GameState = 'BETTING' | 'PLAYER_TURN' | 'DEALER_TURN' | 'RESOLUTION';

interface PlayerHand {
    cards: CardState[];
    bet: number;
    isFinished: boolean; // Did they bust or stand?
    doubleDown: boolean;
    winAmount: number;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function drawRandomCard(): CardState {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
    return { suit, rank, isHidden: false };
}

function getCardValue(rank: Rank): number {
    if (['J', 'Q', 'K'].includes(rank)) return 10;
    if (rank === 'A') return 11;
    return parseInt(rank);
}

function getHandDetails(cards: CardState[]) {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
        if (!card.isHidden) {
            if (card.rank === 'A') aces += 1;
            total += getCardValue(card.rank as Rank);
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

export default function BlackjackPage({
    playerPubkey: _playerPubkey,
    allBalances: _allBalances,
    prices: _prices,
    onGameEnd: _onGameEnd,
}: BlackjackPageProps) {
    const [gameState, setGameState] = useState<GameState>('BETTING');
    const [bet, setBet] = useState(0);
    const [dealerHand, setDealerHand] = useState<CardState[]>([]);
    const [playerHands, setPlayerHands] = useState<PlayerHand[]>([]);
    const [activeHandIndex, setActiveHandIndex] = useState(0);
    const [notification, setNotification] = useState<string | null>(null);

    const placeBet = (amount: number) => {
        if (gameState !== 'BETTING') return;
        setBet((prev) => prev + amount);
    };

    const clearBet = () => {
        if (gameState !== 'BETTING') return;
        setBet(0);
    };

    const notify = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    const dealRound = () => {
        if (bet <= 0) return;
        setGameState('PLAYER_TURN');
        setActiveHandIndex(0);
        setNotification(null);

        const initialPlayerHand: PlayerHand = {
            cards: [drawRandomCard(), drawRandomCard()],
            bet: bet,
            isFinished: false,
            doubleDown: false,
            winAmount: 0,
        };

        setPlayerHands([initialPlayerHand]);
        setDealerHand([
            { ...drawRandomCard(), isHidden: true },
            drawRandomCard()
        ]);
    };

    // Check for immediate blackjack
    useEffect(() => {
        if (gameState === 'PLAYER_TURN') {
            const pDetails = getHandDetails(playerHands[0].cards);
            if (pDetails.isBlackjack) {
                setGameState('DEALER_TURN');
            }
        }
    }, [gameState, playerHands]);

    // Dealer play loop
    useEffect(() => {
        if (gameState === 'DEALER_TURN') {
            const playDealer = async () => {
                // Reveal hole card
                let currentDealerCards = [...dealerHand];
                if (currentDealerCards[0] && currentDealerCards[0].isHidden) {
                    currentDealerCards[0] = { ...currentDealerCards[0], isHidden: false };
                    setDealerHand(currentDealerCards);
                    await new Promise((r) => setTimeout(r, 600)); // small delay for animation
                }

                // Check if all player hands busted/blackjacks, maybe dealer doesn't need to draw
                let needsToDraw = false;
                for (const hand of playerHands) {
                    const det = getHandDetails(hand.cards);
                    if (!det.isBust && !det.isBlackjack) {
                        needsToDraw = true;
                    }
                }

                while (needsToDraw) {
                    const details = getHandDetails(currentDealerCards);
                    // Hit soft 17
                    if (details.value < 17 || (details.value === 17 && details.isSoft)) {
                        await new Promise((r) => setTimeout(r, 600));
                        currentDealerCards = [...currentDealerCards, drawRandomCard()];
                        setDealerHand(currentDealerCards);
                    } else {
                        break;
                    }
                }

                await new Promise((r) => setTimeout(r, 500));
                setGameState('RESOLUTION');
            };
            playDealer();
        }
    }, [gameState]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (gameState === 'RESOLUTION') {
            resolveGame();
        }
    }, [gameState]); // eslint-disable-line react-hooks/exhaustive-deps

    const resolveGame = () => {
        const dealerDetails = getHandDetails(dealerHand);
        let totalWon = 0;
        let newHands = [...playerHands];

        for (let i = 0; i < newHands.length; i++) {
            const hand = newHands[i];
            const pDetails = getHandDetails(hand.cards);
            let winAmt = 0;

            if (pDetails.isBust) {
                winAmt = -hand.bet;
            } else if (pDetails.isBlackjack) {
                if (dealerDetails.isBlackjack) {
                    winAmt = 0; // Push
                } else {
                    winAmt = hand.bet * 1.5; // 3:2 payout
                }
            } else if (dealerDetails.isBust) {
                winAmt = hand.bet;
            } else if (pDetails.value > dealerDetails.value) {
                winAmt = hand.bet;
            } else if (pDetails.value < dealerDetails.value) {
                winAmt = -hand.bet;
            } else {
                winAmt = 0; // Push
            }

            newHands[i].winAmount = winAmt;
            totalWon += winAmt;
        }

        setPlayerHands(newHands);

        if (totalWon > 0) {
            notify(`You won $${totalWon.toLocaleString()}!`);
        } else if (totalWon < 0) {
            notify(`Dealer wins.`);
        } else {
            notify(`Push.`);
        }
    };

    const advanceHand = (handsBuffer: PlayerHand[]) => {
        if (activeHandIndex + 1 < handsBuffer.length) {
            setActiveHandIndex((p) => p + 1);
        } else {
            setGameState('DEALER_TURN');
        }
    };

    const hit = () => {
        const newHands = [...playerHands];
        newHands[activeHandIndex].cards.push(drawRandomCard());

        const details = getHandDetails(newHands[activeHandIndex].cards);
        if (details.isBust || details.value === 21) {
            newHands[activeHandIndex].isFinished = true;
            setPlayerHands(newHands);
            setTimeout(() => advanceHand(newHands), 600);
        } else {
            setPlayerHands(newHands);
        }
    };

    const stand = () => {
        const newHands = [...playerHands];
        newHands[activeHandIndex].isFinished = true;
        setPlayerHands(newHands);
        advanceHand(newHands);
    };

    const doubleDown = () => {
        const newHands = [...playerHands];
        newHands[activeHandIndex].bet *= 2;
        newHands[activeHandIndex].doubleDown = true;
        newHands[activeHandIndex].cards.push(drawRandomCard());
        newHands[activeHandIndex].isFinished = true;

        setPlayerHands(newHands);
        setTimeout(() => advanceHand(newHands), 600);
    };

    const split = () => {
        const activeHand = playerHands[activeHandIndex];
        if (playerHands.length > 1) return; // Only 1 split allowed
        if (activeHand.cards.length !== 2) return;
        if (activeHand.cards[0].rank !== activeHand.cards[1].rank) return;
        if (activeHand.cards[0].rank === 'A') return; // No breaking aces

        const hand1: PlayerHand = {
            cards: [activeHand.cards[0], drawRandomCard()],
            bet: activeHand.bet,
            isFinished: false,
            doubleDown: false,
            winAmount: 0,
        };

        const hand2: PlayerHand = {
            cards: [activeHand.cards[1], drawRandomCard()],
            bet: activeHand.bet,
            isFinished: false,
            doubleDown: false,
            winAmount: 0,
        };

        setPlayerHands([hand1, hand2]);
    };

    const resetGame = () => {
        setGameState('BETTING');
        setPlayerHands([]);
        setDealerHand([]);
        setNotification(null);
    };

    // Validations for buttons
    const activeHand = playerHands[activeHandIndex];
    const canSplit = gameState === 'PLAYER_TURN' &&
        playerHands.length === 1 &&
        activeHand?.cards.length === 2 &&
        activeHand?.cards[0].rank === activeHand?.cards[1].rank &&
        activeHand?.cards[0].rank !== 'A';

    const canDouble = gameState === 'PLAYER_TURN' && activeHand?.cards.length === 2 && playerHands.length === 1;

    const getDealerScoreDisplay = () => {
        if (gameState === 'BETTING' || dealerHand.length === 0) return '';
        if (gameState === 'PLAYER_TURN') {
            return getCardValue(dealerHand[1].rank as Rank).toString();
        }
        const det = getHandDetails(dealerHand);
        if (det.isBlackjack) return 'Blackjack';
        if (det.isBust) return 'Bust';
        return det.isSoft ? `Soft ${det.value}` : det.value.toString();
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4 flex flex-col items-center">
            <div className="w-full max-w-5xl bg-[#1e5831] rounded-[3rem] border-8 border-[#3b2313] shadow-2xl overflow-hidden relative min-h-[700px] flex flex-col justify-between p-8">

                {/* Environment Decor */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border-2 border-white/20 rounded-full pointer-events-none"></div>
                <div className="absolute top-[45%] left-1/2 -translate-x-1/2 text-white/30 font-serif text-3xl font-bold tracking-widest pointer-events-none uppercase">
                    Blackjack Pays 3 to 2
                </div>
                <div className="absolute top-[52%] left-1/2 -translate-x-1/2 text-white/20 font-serif text-xl tracking-wider pointer-events-none uppercase">
                    Dealer must draw to 16, and stand on all 17s
                </div>

                {/* Notification Toast */}
                {notification && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/80 text-white px-8 py-4 rounded-full text-2xl font-black uppercase tracking-widest border border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.8)] animate-pulse">
                        {notification}
                    </div>
                )}

                {/* Dealer Area */}
                <div className="w-full flex flex-col items-center z-10 transition-all">
                    <div className="flex justify-center -space-x-12 sm:-space-x-16 h-36 sm:h-48 mb-4">
                        {dealerHand.map((card, i) => (
                            <Card key={i} suit={card.suit} rank={card.rank} isHidden={card.isHidden} className="shadow-2xl" />
                        ))}
                    </div>
                    <div className="flex items-center space-x-2">
                        <p className="text-white/80 font-bold tracking-widest uppercase bg-black/40 px-4 py-1 rounded-full text-sm">Dealer</p>
                        {dealerHand.length > 0 && (
                            <span className="text-white font-black bg-panel px-3 py-1 rounded-full">{getDealerScoreDisplay()}</span>
                        )}
                    </div>
                </div>

                {/* Player Area */}
                <div className="w-full flex flex-col items-center z-10 pt-8 flex-1 justify-end">
                    <div className="flex justify-center space-x-12 sm:space-x-24 mb-8">
                        {playerHands.map((hand, idx) => {
                            const det = getHandDetails(hand.cards);
                            const isActive = gameState === 'PLAYER_TURN' && activeHandIndex === idx;
                            return (
                                <div key={idx} className={`flex flex-col items-center transition-all ${isActive ? 'scale-110' : 'scale-100 opacity-80'}`}>
                                    <div className="flex justify-center -space-x-12 sm:-space-x-16 h-36 sm:h-48 mb-4">
                                        {hand.cards.map((card, i) => (
                                            <Card key={i} suit={card.suit} rank={card.rank} className="shadow-2xl" />
                                        ))}
                                    </div>
                                    <div className="flex flex-col items-center space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-white/80 font-bold tracking-widest uppercase bg-black/40 px-4 py-1 rounded-full text-sm">Player</span>
                                            <span className={`font-black px-3 py-1 rounded-full ${det.isBust ? 'bg-red-600 text-white' : det.isBlackjack ? 'bg-yellow-500 text-black' : 'bg-panel text-white'}`}>
                                                {det.isBlackjack ? 'Blackjack' : det.isBust ? 'Bust' : det.value}
                                            </span>
                                        </div>
                                        <div className="form-bold text-white tracking-widest bg-black/50 px-3 py-1 rounded">Bet: ${hand.bet}</div>
                                        {gameState === 'RESOLUTION' && hand.winAmount !== 0 && (
                                            <div className={`font-bold text-xl ${hand.winAmount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {hand.winAmount > 0 ? '+' : '-'}${Math.abs(hand.winAmount)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Controls Area */}
                    <div className="flex flex-col items-center space-y-4 w-full max-w-2xl bg-black/50 p-6 rounded-3xl backdrop-blur-sm border border-white/10 shrink-0">

                        {gameState === 'BETTING' && (
                            <>
                                <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-2">
                                    {[1, 5, 10, 50, 100, 500].map(amt => (
                                        <Chip key={amt} amount={amt as ChipDenomination} onClick={() => placeBet(amt)} />
                                    ))}
                                </div>
                                <div className="flex space-x-4 items-center">
                                    <p className="text-white font-bold text-2xl mr-4">Total Bet: <span className="text-primary">${bet}</span></p>
                                    <button onClick={clearBet} className="text-white/60 hover:text-white uppercase font-bold text-sm bg-white/10 px-4 py-2 rounded-lg">Clear</button>
                                    <button
                                        onClick={dealRound}
                                        disabled={bet <= 0}
                                        className="bg-primary hover:bg-primaryHover disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-black text-xl px-12 py-3 rounded-full transition-all shadow-lg shadow-primary/30 uppercase tracking-widest"
                                    >
                                        Deal
                                    </button>
                                </div>
                            </>
                        )}

                        {gameState === 'PLAYER_TURN' && (
                            <div className="flex space-x-4">
                                <button onClick={hit} className="bg-blue-600 hover:bg-blue-500 text-white font-black text-lg px-8 py-3 rounded-xl shadow-lg transition-transform hover:-translate-y-1 uppercase tracking-widest">Hit</button>
                                <button onClick={stand} className="bg-red-600 hover:bg-red-500 text-white font-black text-lg px-8 py-3 rounded-xl shadow-lg transition-transform hover:-translate-y-1 uppercase tracking-widest">Stand</button>
                                <button
                                    onClick={doubleDown}
                                    disabled={!canDouble}
                                    className={`bg-yellow-600 hover:bg-yellow-500 text-white font-black text-lg px-8 py-3 rounded-xl shadow-lg transition-transform uppercase tracking-widest ${!canDouble && 'opacity-30 cursor-not-allowed'}`}
                                >
                                    Double
                                </button>
                                <button
                                    onClick={split}
                                    disabled={!canSplit}
                                    className={`bg-purple-600 hover:bg-purple-500 text-white font-black text-lg px-8 py-3 rounded-xl shadow-lg transition-transform uppercase tracking-widest ${!canSplit && 'opacity-30 cursor-not-allowed'}`}
                                >
                                    Split
                                </button>
                            </div>
                        )}

                        {gameState === 'RESOLUTION' && (
                            <button onClick={resetGame} className="bg-primary hover:bg-primaryHover text-slate-900 font-black text-xl px-12 py-3 rounded-full transition-all shadow-lg shadow-primary/30 uppercase tracking-widest animate-bounce mt-2">
                                New Game
                            </button>
                        )}

                        {(gameState === 'DEALER_TURN') && (
                            <div className="text-white/60 animate-pulse font-bold tracking-widest uppercase">
                                Dealer is playing...
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
