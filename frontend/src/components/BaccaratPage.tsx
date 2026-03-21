import { useState, useCallback } from 'react';
import { type BaccaratBets, useBaccaratEngine } from './baccarat/useBaccaratEngine';
import { BettingTable } from './baccarat/BettingTable';
import { HandDisplay } from './baccarat/HandDisplay';
import { Chip, type ChipDenomination } from './blackjack/Chip';
import { WagerInput } from './ui/WagerInput';
import { ProvablyFair } from './ui/ProvablyFair';
import { type CardState } from './blackjack/Card';

interface BaccaratPageProps {
    playerPubkey: string;
    allBalances: any[];
    prices: Record<string, number>;
    onGameEnd: () => void;
}

type GameState = 'BETTING' | 'DEALING' | 'RESOLUTION';

export default function BaccaratPage({ allBalances, prices, onGameEnd }: BaccaratPageProps) {
    const [gameState, setGameState] = useState<GameState>('BETTING');
    const [bets, setBets] = useState<BaccaratBets>({ player: 0, banker: 0, tie: 0 });
    const [currencySymbol, setCurrencySymbol] = useState('BTC');
    const [selectedChip, setSelectedChip] = useState<ChipDenomination>(1);
    const [notification, setNotification] = useState<string | null>(null);

    // Game Result State
    const [result, setResult] = useState<{
        winner: 'player' | 'banker' | 'tie';
        playerHand: CardState[];
        bankerHand: CardState[];
        playerScore: number;
        bankerScore: number;
    } | null>(null);

    const { deal } = useBaccaratEngine();

    const addBet = useCallback((zone: keyof BaccaratBets) => {
        if (gameState !== 'BETTING') return;
        setBets(prev => ({ ...prev, [zone]: prev[zone] + selectedChip }));
    }, [gameState, selectedChip]);

    const clearBets = useCallback(() => {
        if (gameState !== 'BETTING') return;
        setBets({ player: 0, banker: 0, tie: 0 });
    }, [gameState]);

    const startDeal = useCallback(async () => {
        const totalWager = bets.player + bets.banker + bets.tie;
        if (totalWager <= 0 || gameState !== 'BETTING') return;

        setGameState('DEALING');
        setNotification(null);

        // Simulation logic
        const gameResult = deal(bets, currencySymbol, prices);
        setResult(gameResult);

        // Animation duration simulation (matched to HandDisplay)
        const animationTime = 3500; // sequential deal + buffer
        setTimeout(() => {
            setGameState('RESOLUTION');

            if (gameResult.winAmountUsd > 0) {
                setNotification(`YOU WON $${gameResult.winAmountUsd.toFixed(2)}!`);
            } else if (gameResult.winAmountUsd < 0) {
                setNotification('HOUSE WINS');
            } else {
                setNotification('PUSH');
            }

            onGameEnd(); // Deduct wager balance / Add winnings simulation
        }, animationTime);

    }, [bets, currencySymbol, prices, deal, onGameEnd, gameState]);

    const resetGame = useCallback(() => {
        setGameState('BETTING');
        setBets({ player: 0, banker: 0, tie: 0 });
        setResult(null);
        setNotification(null);
    }, []);

    const totalBet = bets.player + bets.banker + bets.tie;

    return (
        <div className="w-full max-w-7xl mx-auto px-4 flex flex-col md:flex-row gap-6 h-full min-h-[700px]">
            {/* Sidebar Controls */}
            <div className="w-full md:w-80 flex-shrink-0">
                <div className="flex flex-col gap-4 bg-panel min-w-[280px] p-5 rounded-lg border-2 border-[#1a2d37] shadow-xl h-full">
                    <div className="flex-1 space-y-4">
                        <WagerInput
                            wager={totalBet}
                            setWager={() => { }} // Disabled as we use chip clicks
                            currencySymbol={currencySymbol}
                            setCurrencySymbol={setCurrencySymbol}
                            allBalances={allBalances}
                            prices={prices}
                            disabled={true} // Baccarat uses chip placement on zones
                        />

                        <div className="pt-4 mt-auto space-y-4">
                            <span className="text-[10px] text-white/40 font-black tracking-widest uppercase block text-center mb-2">Select Chip</span>
                            <div className="flex flex-wrap justify-center gap-1 mb-2">
                                {[1, 5, 10, 50, 100, 500].map(amt => (
                                    <div key={amt} className={`scale-75 origin-center -m-2 transition-transform ${selectedChip === amt ? 'scale-90 -translate-y-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 'opacity-60 hover:opacity-100'}`}>
                                        <Chip amount={amt as ChipDenomination} onClick={() => setSelectedChip(amt as ChipDenomination)} />
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={clearBets}
                                disabled={gameState !== 'BETTING' || totalBet === 0}
                                className="w-full text-white/60 hover:text-white uppercase font-bold text-sm bg-white/10 px-4 py-2 rounded-lg disabled:opacity-30"
                            >
                                Clear Bets
                            </button>
                            {gameState === 'BETTING' ? (
                                <button
                                    className="w-full bg-primary hover:bg-primaryHover disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-black text-xl px-12 py-3 rounded-lg shadow-lg shadow-primary/30 uppercase tracking-widest transition-all"
                                    onClick={startDeal}
                                    disabled={totalBet <= 0}
                                >
                                    Deal
                                </button>
                            ) : gameState === 'RESOLUTION' ? (
                                <button
                                    className="w-full bg-primary hover:bg-primaryHover text-slate-900 font-black text-xl px-12 py-3 rounded-lg shadow-lg shadow-primary/30 uppercase tracking-widest animate-pulse mt-2"
                                    onClick={resetGame}
                                >
                                    New Game
                                </button>
                            ) : (
                                <div className="w-full bg-blue-600/20 text-blue-400 font-black text-xl px-12 py-3 rounded-lg text-center uppercase tracking-widest opacity-50">
                                    Dealing...
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5">
                        <ProvablyFair
                            gameId={null}
                            clientSeed={null}
                            serverSeedHash={null}
                            serverSeedShown={null}
                        />
                    </div>
                </div>
            </div>

            {/* Main Game Area */}
            <div className="flex-1 flex flex-col items-center justify-start bg-panel border-2 border-[#1a2d37] rounded-lg p-0 min-h-[600px] gap-0 overflow-hidden">
                <div className="w-full bg-[#1e5831] border-b-[10px] border-[#3b2313] shadow-[inset_0_30px_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex-1 flex flex-col items-center p-8">

                    {/* Environment Decor */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border-2 border-white/10 rounded-full pointer-events-none"></div>
                    <div className="absolute top-[40%] left-1/2 -translate-x-1/2 text-white/10 font-serif text-4xl font-black tracking-[0.5em] pointer-events-none uppercase whitespace-nowrap">
                        Punto Banco
                    </div>

                    {/* Notification Toast */}
                    {notification && gameState === 'RESOLUTION' && (
                        <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/95 text-white px-12 py-6 rounded-2xl text-4xl font-black uppercase tracking-widest border-2 border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-300">
                            {notification}
                        </div>
                    )}

                    {/* Hand Display Area */}
                    <HandDisplay
                        playerHand={result?.playerHand || []}
                        bankerHand={result?.bankerHand || []}
                        playerScore={result?.playerScore || 0}
                        bankerScore={result?.bankerScore || 0}
                        winner={gameState === 'RESOLUTION' ? result?.winner || null : null}
                        isDealing={gameState === 'DEALING'}
                    />

                    {/* Betting Table Layer */}
                    <BettingTable
                        bets={bets}
                        onBetZone={addBet}
                        locked={gameState !== 'BETTING'}
                        winner={gameState === 'RESOLUTION' ? result?.winner || null : null}
                    />
                </div>
            </div>
        </div>
    );
}
