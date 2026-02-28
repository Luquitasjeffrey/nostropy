import { Button } from '../ui/Button';
import { Bomb } from 'lucide-react';

interface MinesControlsProps {
    wager: number;
    setWager: (val: number) => void;
    minesCount: number;
    setMinesCount: (val: number) => void;
    startGame: () => void;
    cashOut: () => void;
    status: 'initial' | 'waiting' | 'active' | 'lost' | 'cashed';
    multiplier: number;
    canCash: boolean;
    payout: number | null;
}

export function MinesControls({
    wager,
    setWager,
    minesCount,
    setMinesCount,
    startGame,
    cashOut,
    status,
    multiplier,
    canCash,
}: MinesControlsProps) {
    const isPlaying = status === 'active' || status === 'waiting';

    return (
        <div className="flex flex-col gap-4 bg-panel min-w-[280px] p-5 rounded-lg border-2 border-[#1a2d37] shadow-xl h-full">
            <div className="flex-1 space-y-4">
                {/* Wager Input */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-gray-400">Bet Amount</label>
                        <span className="text-xs text-gray-500 font-bold">$0.00</span>
                    </div>
                    <div className="relative flex items-center bg-[#0f212e] rounded-md border-2 border-[#1a2d37] focus-within:border-gray-500 transition-colors group">
                        <span className="pl-3 text-gray-400 font-bold text-sm select-none">$</span>
                        <input
                            type="number"
                            disabled={isPlaying}
                            className="flex h-11 w-full bg-transparent px-2 py-2 text-sm text-white font-bold placeholder:text-gray-600 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            value={wager}
                            onChange={(e) => setWager(Number(e.target.value))}
                        />
                        <div className="flex items-center space-x-1 pr-1">
                            <button disabled={isPlaying} onClick={() => setWager(Math.max(0, wager / 2))} className="text-xs font-bold text-gray-400 bg-panel px-2 py-1 rounded hover:bg-gray-600 transition-colors disabled:opacity-50">½</button>
                            <button disabled={isPlaying} onClick={() => setWager(wager * 2)} className="text-xs font-bold text-gray-400 bg-panel px-2 py-1 rounded hover:bg-gray-600 transition-colors disabled:opacity-50">2x</button>
                        </div>
                    </div>
                </div>

                {/* Mines Count */}
                <div>
                    <label className="text-xs font-semibold text-gray-400 mb-1 block">Mines</label>
                    <div className="relative flex items-center bg-[#0f212e] rounded-md border-2 border-[#1a2d37] focus-within:border-gray-500 transition-colors">
                        <div className="pl-3 text-gray-400 flex items-center justify-center">
                            <Bomb size={16} />
                        </div>
                        <select
                            disabled={isPlaying}
                            className="flex h-11 w-full bg-transparent px-3 py-2 text-sm text-white font-bold focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                            value={minesCount}
                            onChange={(e) => setMinesCount(Number(e.target.value))}
                        >
                            {Array.from({ length: 24 }).map((_, i) => (
                                <option key={i + 1} value={i + 1} className="bg-panel">{i + 1}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                            ▼
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Action Button */}
            <div className="mt-auto pt-4">
                {isPlaying ? (
                    <Button
                        className="w-full text-lg shadow-[0_4px_0_0_#16a34a] hover:shadow-[0_2px_0_0_#16a34a]"
                        variant="success"
                        size="lg"
                        disabled={!canCash}
                        onClick={cashOut}
                    >
                        {canCash ? `Cashout ${((wager * multiplier) || 0).toFixed(2)}` : 'Cashout'}
                    </Button>
                ) : (
                    <Button className="w-full text-lg shadow-[0_4px_0_0_#00c700] hover:shadow-[0_2px_0_0_#00c700]" size="lg" onClick={startGame}>
                        Bet
                    </Button>
                )}
            </div>

        </div>
    );
}
