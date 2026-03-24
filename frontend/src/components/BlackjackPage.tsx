import { useState } from 'react';
import { Card, type Suit, type Rank, type CardState } from './blackjack/Card';
import { Chip, type ChipDenomination } from './blackjack/Chip';
import { WagerInput } from './ui/WagerInput';
import { ProvablyFair } from './ui/ProvablyFair';

import { API_URL } from '../config';
import { authRequest } from '../utils/api';

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

// No more hanging lines here

// Get card value for UI display
function getCardValueUI(rank: Rank | string): number {
    if (['J', 'Q', 'K'].includes(rank as any)) return 10;
    if (rank === 'A') return 11;
    return parseInt(rank as string);
}

// Calculate details for UI display
function getHandDetailsUI(cards: CardState[]) {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
        if (!card.isHidden) {
            if (card.rank === 'A') aces += 1;
            total += getCardValueUI(card.rank ?? '');
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
    const [currencySymbol, setCurrencySymbol] = useState('BTC');
    const [dealerHand, setDealerHand] = useState<CardState[]>([]);
    const [playerHands, setPlayerHands] = useState<PlayerHand[]>([]);
    const [activeHandIndex, setActiveHandIndex] = useState(0);
    const [notification, setNotification] = useState<string | null>(null);

    // Backend State
    const [gameId, setGameId] = useState<string | null>(null);
    const [clientSeed, setClientSeed] = useState<string | null>(null);
    const [serverSeedHash, setServerSeedHash] = useState<string | null>(null);
    const [serverSeedShown, setServerSeedShown] = useState<string | null>(null);
    const [isActionDisabled, setIsActionDisabled] = useState(false); // Prevents fast-clicks sending multiple requests

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

    const dealRound = async () => {
        if (bet <= 0) return;

        setIsActionDisabled(true);
        setNotification(null);
        setServerSeedShown(null);
        setClientSeed(null);

        try {
            const price = _prices[currencySymbol] || 1;
            const cryptoAmount = bet / price;
            const decimals = currencySymbol == 'BTC' ? 8 : 6;
            const wagerInt = Math.floor(cryptoAmount * Math.pow(10, decimals));

            // 1. POST /newgame
            const resNew = await authRequest(`${API_URL}/api/games/blackjack/newgame`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerPubkey: _playerPubkey,
                    wagerAmount: wagerInt,
                    currencySymbol,
                }),
            });

            const dataNew = await resNew.json();
            if (!resNew.ok) throw new Error(dataNew.error || 'Failed to start game');

            setGameId(dataNew.gameId);
            setServerSeedHash(dataNew.serverSeedHash);
            setServerSeedShown(null);

            _onGameEnd(); // deduct wager balance

            // 2. POST /set_client_seed
            const newClientSeed = Math.random().toString(36).substring(2, 15);
            setClientSeed(newClientSeed);

            const resSeed = await authRequest(`${API_URL}/api/games/blackjack/set_client_seed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerPubkey: _playerPubkey,
                    gameId: dataNew.gameId,
                    clientSeed: newClientSeed,
                }),
            });

            const dataSeed = await resSeed.json();
            if (!resSeed.ok) throw new Error(dataSeed.error || 'Failed to set client seed');

            updateGameStateFromResponse(dataSeed);

        } catch (error: any) {
            console.error(error);
            notify(error.message || 'Error occurred while dealing');
        } finally {
            setIsActionDisabled(false);
        }
    };

    const updateGameStateFromResponse = (data: any) => {
        if (data.player_hands) setPlayerHands(data.player_hands);
        if (data.dealer_hand) setDealerHand(data.dealer_hand);
        if (typeof data.active_hand_index === 'number') setActiveHandIndex(data.active_hand_index);

        if (data.status === 'ACTIVE') {
            setGameState('PLAYER_TURN');
        } else if (data.status === 'CASHED_OUT') {
            setGameState('RESOLUTION');
            setServerSeedShown(data.serverSeed?.seed || data.serverSeed || '');
            _onGameEnd(); // updates balance

            // show notification based on total payout logic -> we can sum winAmount of all hands
            let netWonAmountUsd = 0;
            const price = _prices[currencySymbol] || 1;
            const decimals = currencySymbol === 'BTC' ? 8 : 6;

            if (data.player_hands) {
                for (const hand of data.player_hands) {
                    const amountScaled = hand.winAmount / Math.pow(10, decimals);
                    const usdWon = amountScaled * price;
                    netWonAmountUsd += usdWon;
                }
            }

            if (netWonAmountUsd > 0) {
                notify(`You won $${netWonAmountUsd.toFixed(2)}!`);
            } else if (netWonAmountUsd < 0) {
                notify(`Dealer wins.`);
            } else {
                notify(`Push.`);
            }
        }
    };

    const takeAction = async (endpoint: string) => {
        if (isActionDisabled || !gameId) return;
        setIsActionDisabled(true);

        try {
            const res = await authRequest(`${API_URL}/api/games/blackjack/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerPubkey: _playerPubkey,
                    gameId: gameId,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Failed to ${endpoint}`);

            if (endpoint === 'doubledown' || endpoint === 'split') {
                _onGameEnd(); // updates balance because double/split requires extra coin
            }

            updateGameStateFromResponse(data);
        } catch (error: any) {
            console.error(error);
            notify(error.message || `Error calling ${endpoint}`);
        } finally {
            setIsActionDisabled(false);
        }
    };

    const hit = () => takeAction('hit');
    const stand = () => takeAction('stand');
    const doubleDown = () => takeAction('doubledown');
    const split = () => takeAction('split');

    const resetGame = () => {
        setGameState('BETTING');
        setPlayerHands([]);
        setDealerHand([]);
        setNotification(null);
        setServerSeedShown(null);
        setClientSeed(null);
        setServerSeedHash(null);
        setGameId(null);
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
        if (gameState === 'PLAYER_TURN' && dealerHand.length > 1) {
            return getCardValueUI(dealerHand[1].rank ?? '').toString();
        }
        const det = getHandDetailsUI(dealerHand);
        if (det.isBlackjack) return 'Blackjack';
        if (det.isBust) return 'Bust';
        return det.isSoft ? `Soft ${det.value}` : det.value.toString();
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 flex flex-col md:flex-row gap-6">
            {/* Sidebar Controls */}
            <div className="w-full md:w-80 flex-shrink-0">
                <div className="flex flex-col gap-4 bg-panel min-w-[280px] p-5 rounded-lg border-2 border-[#1a2d37] shadow-xl h-full">
                    <div className="flex-1 space-y-4">
                        <WagerInput
                            wager={bet}
                            setWager={setBet}
                            currencySymbol={currencySymbol}
                            setCurrencySymbol={setCurrencySymbol}
                            allBalances={_allBalances}
                            prices={_prices}
                            disabled={gameState !== 'BETTING'}
                        />

                        {gameState === 'BETTING' && (
                            <div className="pt-4 mt-auto space-y-4">
                                <div className="flex flex-wrap justify-center gap-1 mb-2">
                                    {[1, 5, 10, 50, 100, 500].map(amt => (
                                        <div key={amt} className="scale-75 origin-center -m-2">
                                            <Chip amount={amt as ChipDenomination} onClick={() => placeBet(amt)} />
                                        </div>
                                    ))}
                                </div>
                                <button onClick={clearBet} className="w-full text-white/60 hover:text-white uppercase font-bold text-sm bg-white/10 px-4 py-2 rounded-lg">Clear Bet</button>
                                <button
                                    className="w-full bg-primary hover:bg-primaryHover disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-black text-xl px-12 py-3 rounded-lg shadow-lg shadow-primary/30 uppercase tracking-widest"
                                    onClick={dealRound}
                                    disabled={bet <= 0 || isActionDisabled}
                                >
                                    Deal
                                </button>
                            </div>
                        )}

                        {gameState === 'PLAYER_TURN' && (
                            <div className="flex flex-col gap-2 pt-4">
                                <button onClick={hit} disabled={isActionDisabled} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-lg px-8 py-3 rounded-xl shadow-lg transition-transform hover:-translate-y-1 uppercase tracking-widest">Hit</button>
                                <button onClick={stand} disabled={isActionDisabled} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-lg px-8 py-3 rounded-xl shadow-lg transition-transform hover:-translate-y-1 uppercase tracking-widest">Stand</button>
                                <button
                                    onClick={doubleDown}
                                    disabled={!canDouble || isActionDisabled}
                                    className={`bg-yellow-600 hover:bg-yellow-500 text-white font-black text-lg px-8 py-3 rounded-xl shadow-lg transition-transform uppercase tracking-widest ${(!canDouble || isActionDisabled) && 'opacity-30 cursor-not-allowed'}`}
                                >
                                    Double
                                </button>
                                <button
                                    onClick={split}
                                    disabled={!canSplit || isActionDisabled}
                                    className={`bg-purple-600 hover:bg-purple-500 text-white font-black text-lg px-8 py-3 rounded-xl shadow-lg transition-transform uppercase tracking-widest ${(!canSplit || isActionDisabled) && 'opacity-30 cursor-not-allowed'}`}
                                >
                                    Split
                                </button>
                            </div>
                        )}

                        {gameState === 'RESOLUTION' && (
                            <div className="pt-4">
                                <button onClick={resetGame} className="w-full bg-primary hover:bg-primaryHover text-slate-900 font-black text-xl px-12 py-3 rounded-lg shadow-lg shadow-primary/30 uppercase tracking-widest animate-pulse mt-2">
                                    New Game
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Game Area */}
            <div className="flex-1 flex flex-col items-center justify-center bg-panel border-2 border-[#1a2d37] rounded-lg p-0 min-h-[500px] gap-0 overflow-hidden">
                <div className="w-full bg-[#1e5831] border-b-[10px] border-[#3b2313] shadow-[inset_0_30px_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex-1 flex flex-col justify-between p-8">

                    {/* Environment Decor */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border-2 border-white/20 rounded-full pointer-events-none"></div>
                    <div className="absolute top-[45%] left-1/2 -translate-x-1/2 text-white/30 font-serif text-3xl font-bold tracking-widest pointer-events-none uppercase whitespace-nowrap">
                        Blackjack Pays 3 to 2
                    </div>
                    <div className="absolute top-[52%] left-1/2 -translate-x-1/2 text-white/20 font-serif text-xl tracking-wider pointer-events-none uppercase whitespace-nowrap">
                        Dealer must draw to 16, and stand on all 17s
                    </div>

                    {/* Notification Toast */}
                    {notification && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/80 text-white px-8 py-4 rounded-full text-2xl font-black uppercase tracking-widest border border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.8)] animate-pulse">
                            {notification}
                        </div>
                    )}

                    {/* Dealer Area */}
                    <div className="w-full flex flex-col items-center z-10 transition-all mt-4">
                        <div className="flex justify-center -space-x-12 sm:-space-x-16 h-36 sm:h-48 mb-4">
                            {dealerHand.map((card, i) => (
                                <Card key={i} suit={card.suit as Suit} rank={card.rank as Rank} isHidden={card.isHidden} className="shadow-2xl" />
                            ))}
                        </div>
                        {gameState !== 'BETTING' && dealerHand.length > 0 && (
                            <div className="flex items-center space-x-2">
                                <p className="text-white/80 font-bold tracking-widest uppercase bg-black/40 px-4 py-1 rounded-full text-sm">Dealer</p>
                                {dealerHand.length > 0 && (
                                    <span className="text-white font-black bg-panel px-3 py-1 rounded-full">{getDealerScoreDisplay()}</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Player Area */}
                    <div className="w-full flex flex-col items-center z-10 pt-8 flex-1 justify-end">
                        <div className="flex justify-center space-x-12 sm:space-x-24 mb-8">
                            {playerHands.map((hand, idx) => {
                                const det = getHandDetailsUI(hand.cards);
                                const isActive = gameState === 'PLAYER_TURN' && activeHandIndex === idx;
                                return (
                                    <div key={idx} className={`flex flex-col items-center transition-all ${isActive ? 'scale-110' : 'scale-100 opacity-80'}`}>
                                        <div className="flex justify-center -space-x-12 sm:-space-x-16 h-36 sm:h-48 mb-4">
                                            {hand.cards.map((card, i) => (
                                                <Card key={i} suit={card.suit as Suit} rank={card.rank as Rank} className="shadow-2xl opacity-100" />
                                            ))}
                                        </div>
                                        {gameState !== 'BETTING' && (
                                            <div className="flex flex-col items-center space-y-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-white/80 font-bold tracking-widest uppercase bg-black/40 px-4 py-1 rounded-full text-sm">Player</span>
                                                    <span className={`font-black px-3 py-1 rounded-full ${det.isBust ? 'bg-red-600 text-white' : det.isBlackjack ? 'bg-yellow-500 text-black' : 'bg-panel text-white'}`}>
                                                        {det.isBlackjack ? 'Blackjack' : det.isBust ? 'Bust' : det.value}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="w-full flex">
                    <div className="flex-1 w-full flex-grow p-4">
                        <ProvablyFair
                            gameId={gameId}
                            clientSeed={clientSeed}
                            serverSeedHash={serverSeedHash}
                            serverSeedShown={serverSeedShown}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
