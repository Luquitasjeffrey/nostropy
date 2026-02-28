import { Button } from '../ui/Button';
import { Bomb } from 'lucide-react';
import { WagerInput } from '../ui/WagerInput';

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
  currencySymbol: string;
  setCurrencySymbol: (val: string) => void;
  allBalances: any[];
  prices: Record<string, number>;
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
  currencySymbol,
  setCurrencySymbol,
  allBalances,
  prices,
}: MinesControlsProps) {
  const isPlaying = status === 'active' || status === 'waiting';

  return (
    <div className="flex flex-col gap-4 bg-panel min-w-[280px] p-5 rounded-lg border-2 border-[#1a2d37] shadow-xl h-full">
      <div className="flex-1 space-y-4">
        {/* Wager Input component handles betting amount and currency selection */}
        <WagerInput
          wager={wager}
          setWager={setWager}
          currencySymbol={currencySymbol}
          setCurrencySymbol={setCurrencySymbol}
          allBalances={allBalances}
          prices={prices}
          disabled={isPlaying}
        />

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
                <option key={i + 1} value={i + 1} className="bg-panel">
                  {i + 1}
                </option>
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
            {canCash ? `Cashout ${(wager * multiplier || 0).toFixed(2)}` : 'Cashout'}
          </Button>
        ) : (
          <Button
            className="w-full text-lg shadow-[0_4px_0_0_#00c700] hover:shadow-[0_2px_0_0_#00c700]"
            size="lg"
            onClick={startGame}
          >
            Bet
          </Button>
        )}
      </div>
    </div>
  );
}
