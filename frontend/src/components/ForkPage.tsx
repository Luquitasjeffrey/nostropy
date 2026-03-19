import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { WagerInput } from './ui/WagerInput';
import { ProvablyFair } from './ui/ProvablyFair';
import { motion, AnimatePresence } from 'framer-motion';
import { GitFork, Shield, User, Cpu } from 'lucide-react';

interface ForkPageProps {
    playerPubkey: string;
    allBalances: any[];
    prices: Record<string, number>;
    onGameEnd: () => void;
}

export default function ForkPage({
    playerPubkey,
    allBalances,
    prices,
    onGameEnd,
}: ForkPageProps) {
    const [currencySymbol, setCurrencySymbol] = useState('BTC');
    const [wager, setWager] = useState(10);

    // Game configuration
    const [hashrate, setHashrate] = useState(0.4); // q
    const [targetBlocks, setTargetBlocks] = useState(6); // z
    const [winProb, setWinProb] = useState(0);
    const [multiplier, setMultiplier] = useState(0);

    // Game state
    const [status, setStatus] = useState<'initial' | 'mining' | 'finished'>('initial');
    const [playerBlocks, setPlayerBlocks] = useState<number>(0);
    const [houseBlocks, setHouseBlocks] = useState<number>(0);
    const [winner, setWinner] = useState<'player' | 'house' | null>(null);
    const [payout, setPayout] = useState<number | null>(null);

    // Mock Provably Fair state
    const [gameId, setGameId] = useState<string | null>(null);
    const [clientSeed, setClientSeed] = useState<string | null>(null);
    const [serverSeedHash, setServerSeedHash] = useState<string | null>(null);
    const [serverSeedShown, setServerSeedShown] = useState<string | null>(null);

    // Probability calculations
    const binomial = (n: number, k: number): number => {
        if (k < 0 || k > n) return 0;
        if (k === 0 || k === n) return 1;
        if (k > n / 2) k = n - k;
        let res = 1;
        for (let i = 1; i <= k; i++) {
            res = res * (n - i + 1) / i;
        }
        return res;
    };

    const calcWinProb = (q: number, z: number): number => {
        let sum = 0;
        for (let k = 0; k < z; k++) {
            const comb = binomial(z - 1 + k, k);
            sum += comb * Math.pow(q, z) * Math.pow(1 - q, k);
        }
        return sum;
    };

    useEffect(() => {
        const prob = calcWinProb(hashrate, targetBlocks);
        setWinProb(prob);
        const houseEdge = 0.02;
        const mult = (1 / prob) * (1 - houseEdge);
        setMultiplier(mult);
    }, [hashrate, targetBlocks]);

    const startGame = async () => {
        if (!playerPubkey || wager <= 0) return;

        setStatus('mining');
        setPlayerBlocks(0);
        setHouseBlocks(0);
        setWinner(null);
        setPayout(null);

        // Mock backend delay and ID generation
        setGameId('fork_' + Math.random().toString(36).substr(2, 9));
        setServerSeedHash('hash_' + Math.random().toString(36).substr(2, 9));
        setClientSeed(Math.random().toString(36).substr(2, 15));

        // Simulation loop
        let p = 0;
        let h = 0;
        const z = targetBlocks;
        const q = hashrate;

        const interval = setInterval(() => {
            if (Math.random() < q) {
                p++;
                setPlayerBlocks(p);
            } else {
                h++;
                setHouseBlocks(h);
            }

            if (p >= z || h >= z) {
                clearInterval(interval);
                const isWin = p >= z;
                setWinner(isWin ? 'player' : 'house');
                setStatus('finished');

                if (isWin) {
                    const usdPayout = wager * multiplier;
                    setPayout(usdPayout);
                }

                setServerSeedShown('seed_' + Math.random().toString(36).substr(2, 15));
                onGameEnd();
            }
        }, 400); // 400ms per block generation for dramatic effect
    };

    const isPlaying = status === 'mining';

    return (
        <div className="w-full max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-6">
            {/* Sidebar Controls */}
            <div className="w-full md:w-80 flex-shrink-0">
                <div className="flex flex-col gap-4 bg-panel min-w-[280px] p-5 rounded-lg border-2 border-[#1a2d37] shadow-xl h-full">
                    <div className="flex-1 space-y-4">
                        <WagerInput
                            wager={wager}
                            setWager={setWager}
                            currencySymbol={currencySymbol}
                            setCurrencySymbol={setCurrencySymbol}
                            allBalances={allBalances}
                            prices={prices}
                            disabled={isPlaying}
                        />

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hashrate (q)</label>
                                <span className="text-xs font-bold text-primary">{(hashrate * 100).toFixed(0)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.05"
                                max="0.95"
                                step="0.01"
                                value={hashrate}
                                onChange={(e) => setHashrate(parseFloat(e.target.value))}
                                disabled={isPlaying}
                                className="w-full accent-primary bg-[#0f212e] h-2 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Blocks (z)</label>
                                <span className="text-xs font-bold text-primary">{targetBlocks}</span>
                            </div>
                            <input
                                type="range"
                                min="2"
                                max="50"
                                step="1"
                                value={targetBlocks}
                                onChange={(e) => setTargetBlocks(parseInt(e.target.value))}
                                disabled={isPlaying}
                                className="w-full accent-primary bg-[#0f212e] h-2 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <div className="bg-[#0f212e] p-2 rounded border border-[#1a2d37]">
                                <div className="text-[10px] text-gray-500 uppercase font-black">Multiplier</div>
                                <div className="text-sm font-bold text-white">{multiplier.toFixed(4)}x</div>
                            </div>
                            <div className="bg-[#0f212e] p-2 rounded border border-[#1a2d37]">
                                <div className="text-[10px] text-gray-500 uppercase font-black">Win Prob</div>
                                <div className="text-sm font-bold text-white">{(winProb * 100).toFixed(2)}%</div>
                            </div>
                        </div>

                        <div className="pt-4 mt-auto">
                            <Button
                                className="w-full text-lg shadow-[0_4px_0_0_#00c700] hover:shadow-[0_2px_0_0_#00c700]"
                                size="lg"
                                onClick={startGame}
                                disabled={isPlaying}
                            >
                                Bet
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Game Area */}
            <div className="flex-1 flex flex-col items-center justify-center bg-panel border-2 border-[#1a2d37] rounded-lg p-8 min-h-[500px] gap-8 relative overflow-hidden">

                {/* Background Decoration */}
                <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
                    <GitFork size={400} />
                </div>

                {/* Status Overlay */}
                <div className="h-32 flex items-center justify-center w-full">
                    <AnimatePresence>
                        {status === 'finished' && (
                            <motion.div
                                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`p-4 rounded-lg border-2 text-center min-w-[300px] shadow-2xl z-10 ${winner === 'player' ? 'bg-[#ed4141]/10 border-[#ed4141] text-[#ed4141]' : 'bg-[#7c3aed]/10 border-[#7c3aed] text-[#7c3aed]'}`}
                            >
                                <div className="text-xl font-black uppercase">
                                    {winner === 'player' ? 'Network Attacked!' : 'Attack Failed'}
                                </div>
                                {winner === 'player' && (
                                    <div className="text-3xl font-black mt-1">
                                        ${payout?.toFixed(2)}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Chains Container */}
                <div className="w-full flex flex-col gap-16 relative z-0 mt-8">

                    {/* Origin Block & SVG Fork Lines */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 lg:-translate-x-20 flex items-center z-10">
                        {/* The "Genesis" Block */}
                        <div className="w-20 h-20 bg-[#1a2d37] border-4 border-gray-500 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] relative">
                            <div className="w-10 h-10 border-2 border-gray-600 rounded-lg opacity-40 rotate-45" />
                            {/* SVG Lines for the Fork */}
                            <svg className="absolute left-full top-0 w-48 h-20 pointer-events-none overflow-visible" viewBox="0 0 100 100">
                                <motion.path
                                    d="M 0 50 C 50 50, 40 12, 110 12"
                                    stroke="#ed4141"
                                    strokeWidth="4"
                                    fill="transparent"
                                    initial={{ pathLength: 0, opacity: 0.2 }}
                                    animate={{ pathLength: 1, opacity: isPlaying || status === 'finished' ? 0.8 : 0.2 }}
                                    transition={{ duration: 1 }}
                                />
                                <motion.path
                                    d="M 0 50 C 50 50, 40 88, 110 88"
                                    stroke="#7c3aed"
                                    strokeWidth="4"
                                    fill="transparent"
                                    initial={{ pathLength: 0, opacity: 0.2 }}
                                    animate={{ pathLength: 1, opacity: isPlaying || status === 'finished' ? 0.8 : 0.2 }}
                                    transition={{ duration: 1 }}
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="flex flex-col gap-20 pl-16 lg:pl-24 relative">

                        {/* Attacker Chain (Player) - RED */}
                        <div className={`space-y-4 transition-all duration-700 ${winner === 'house' ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg transition-colors ${winner === 'house' ? 'bg-gray-800 text-gray-500' : 'bg-[#ed4141]/20 text-[#ed4141]'}`}>
                                    <User size={20} />
                                </div>
                                <span className="font-black uppercase tracking-widest text-sm text-gray-400">Attacker (You)</span>
                                <div className={`flex-1 h-[2px] bg-gradient-to-r ${winner === 'house' ? 'from-gray-800' : 'from-[#ed4141]/50'} to-transparent`}></div>
                                <span className={`font-black text-xl transition-colors ${winner === 'house' ? 'text-gray-500' : 'text-[#ed4141]'}`}>{playerBlocks} / {targetBlocks}</span>
                            </div>

                            <div className="flex flex-wrap gap-3 min-h-[64px] items-center">
                                <AnimatePresence>
                                    {Array.from({ length: playerBlocks }).map((_, i) => (
                                        <motion.div
                                            key={`p-block-${i}`}
                                            initial={{ scale: 0, rotate: -45, y: -20 }}
                                            animate={
                                                winner === 'house'
                                                    ? { y: 100, opacity: 0, rotate: Math.random() * 90 - 45, scale: 0.8 }
                                                    : { scale: 1, rotate: 0, y: 0 }
                                            }
                                            transition={{
                                                type: 'spring',
                                                stiffness: winner === 'house' ? 50 : 300,
                                                damping: winner === 'house' ? 10 : 20,
                                                delay: winner === 'house' ? i * 0.05 : 0
                                            }}
                                            className="w-14 h-14 bg-[#ed4141] rounded-lg flex items-center justify-center shadow-[0_4px_15px_rgba(237,65,101,0.4)] border-2 border-[#ff5f5f] relative overflow-hidden group"
                                        >
                                            <Cpu size={24} className="text-white relative z-10" />
                                            {/* Cracked effect on loss */}
                                            {winner === 'house' && (
                                                <div className="absolute inset-0 bg-black/20 z-20 flex items-center justify-center">
                                                    <div className="w-full h-[2px] bg-white/30 rotate-45 absolute"></div>
                                                    <div className="w-full h-[2px] bg-white/30 -rotate-45 absolute"></div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {isPlaying && (
                                    <motion.div
                                        animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.95, 1.05, 0.95] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                        className="w-14 h-14 border-2 border-dashed border-[#ed4141]/50 rounded-lg flex items-center justify-center"
                                    >
                                        <div className="w-6 h-6 border-2 border-t-transparent border-[#ed4141] rounded-full animate-spin"></div>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Honest Chain (House) - PURPLE */}
                        <div className={`space-y-4 transition-all duration-700 ${winner === 'player' ? 'opacity-40 grayscale-[0.8]' : ''}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg transition-colors ${winner === 'player' ? 'bg-gray-800 text-gray-500' : 'bg-[#7c3aed]/20 text-[#7c3aed]'}`}>
                                    <Shield size={20} />
                                </div>
                                <span className="font-black uppercase tracking-widest text-sm text-gray-500">Honest Network (House)</span>
                                <div className={`flex-1 h-[2px] bg-gradient-to-r ${winner === 'player' ? 'from-gray-800' : 'from-[#7c3aed]/50'} to-transparent`}></div>
                                <span className={`font-black text-xl transition-colors ${winner === 'player' ? 'text-gray-500' : 'text-[#7c3aed]'}`}>{houseBlocks} / {targetBlocks}</span>
                            </div>

                            <div className="flex flex-wrap gap-3 min-h-[64px] items-center">
                                <AnimatePresence>
                                    {Array.from({ length: houseBlocks }).map((_, i) => (
                                        <motion.div
                                            key={`h-block-${i}`}
                                            initial={{ scale: 0, x: -20, opacity: 0 }}
                                            animate={
                                                winner === 'player'
                                                    ? { y: 150, opacity: 0, rotate: Math.random() * 120 - 60, scale: 0.5 }
                                                    : { scale: 1, x: 0, opacity: 1 }
                                            }
                                            transition={{
                                                duration: winner === 'player' ? 1 : 0.4,
                                                delay: winner === 'player' ? i * 0.08 : 0,
                                                ease: winner === 'player' ? "easeIn" : "easeOut"
                                            }}
                                            className="w-14 h-14 bg-[#7c3aed] border-2 border-[#9b66ff] rounded-lg flex items-center justify-center shadow-[0_4px_15px_rgba(124,58,237,0.3)] relative overflow-hidden"
                                        >
                                            <div className="w-8 h-1.5 bg-white/40 rounded-full relative z-10" />
                                            {/* Cracked effect on loss */}
                                            {winner === 'player' && (
                                                <div className="absolute inset-0 bg-black/40 z-20">
                                                    <div className="w-full h-1 bg-white/20 rotate-[30deg] absolute top-1/4"></div>
                                                    <div className="w-full h-1 bg-white/20 -rotate-[15deg] absolute top-3/4"></div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {isPlaying && (
                                    <motion.div
                                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="w-14 h-14 border-2 border-dashed border-[#7c3aed]/40 rounded-lg"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 w-full">
                    <ProvablyFair
                        gameId={gameId}
                        clientSeed={clientSeed}
                        serverSeedHash={serverSeedHash}
                        serverSeedShown={serverSeedShown}
                    />
                </div>
            </div>
        </div>
    );
}
