import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { WagerInput } from './ui/WagerInput';

interface DicePageProps {
  playerPubkey: string;
  allBalances: any[];
  prices: Record<string, number>;
  onGameEnd: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function DicePage({
  playerPubkey,
  allBalances,
  prices,
  onGameEnd,
}: DicePageProps) {
  const [currencySymbol, setCurrencySymbol] = useState('BTC');
  const [wager, setWager] = useState(10);

  // Game state
  const [status, setStatus] = useState<'initial' | 'waiting' | 'finished'>('initial');
  const [payout, setPayout] = useState<number | null>(null);

  // Dice state
  const [target, setTarget] = useState<number>(50); // Roll over target
  const [multiplier, setMultiplier] = useState<number>(1.98); // 99% payout for 50% win chance
  const [winChance, setWinChance] = useState<number>(50); // 50%
  const [rollResult, setRollResult] = useState<number | null>(null);

  // Sync multiplier and win chance when target changes manually
  useEffect(() => {
    const chance = 100 - target;
    setWinChance(chance);

    // House Edge = 1%
    const mult = (1 / (chance / 100)) * 0.99;
    setMultiplier(Number(mult.toFixed(4)));
  }, [target]);

  const handleTargetChange = (val: number) => {
    // Keep it between 2 and 98 to avoid 0% or 100% win chance extremes
    const clamped = Math.min(98, Math.max(2, val));
    setTarget(clamped);
  };

  const handleWinChanceChange = (val: number) => {
    const clamped = Math.min(98, Math.max(2, val));
    setTarget(100 - clamped);
  };

  const handleMultiplierChange = (val: number) => {
    // Math: mult = (1 / chance) * 0.99 
    // => chance = 0.99 / mult
    if (val < 1.0102) return; // Cap multiplier based on 98 max target
    const chance = (0.99 / val) * 100;
    const clampedChance = Math.min(98, Math.max(2, chance));

    // Convert chance back to target
    setTarget(100 - clampedChance);
  };

  const startGame = async () => {
    if (!playerPubkey || wager <= 0) return;

    setStatus('waiting');
    setPayout(null);
    setRollResult(null);

    try {
      const price = prices[currencySymbol] || 1;
      const cryptoAmount = wager / price;
      const wagerInt = Math.floor(cryptoAmount * 100000000); // 8 decimals

      // 1. POST /api/games/dice/new
      const newResponse = await fetch(`${API_URL}/api/games/dice/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerPubkey,
          wagerAmount: wagerInt,
          currencySymbol,
          userNumber: target,
        }),
      });

      const newData = await newResponse.json();
      if (!newResponse.ok) {
        throw new Error(newData.error || 'Failed to start game');
      }

      // Update balance globally (wager deducted)
      onGameEnd();

      // Add delay for dramatics
      await new Promise((res) => setTimeout(res, 600));

      // 2. POST /api/games/dice/set_client_seed
      const clientSeed = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const revealResponse = await fetch(`${API_URL}/api/games/dice/set_client_seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerPubkey,
          gameId: newData.gameId,
          clientSeed,
        }),
      });

      const revealData = await revealResponse.json();
      if (!revealResponse.ok) {
        throw new Error(revealData.error || 'Failed to reveal game');
      }

      setRollResult(revealData.roll_number);
      setStatus('finished');

      if (revealData.status === 'WIN') {
        const price = prices[currencySymbol] || 1;
        const decimals = currencySymbol === 'BTC' ? 8 : 6;
        const cryptoPayout = revealData.payout / Math.pow(10, decimals);
        const usdPayout = cryptoPayout * price;
        setPayout(usdPayout);
      }

      // Update balance globally (payout credited if won)
      onGameEnd();

    } catch (err) {
      console.error(err);
      setStatus('initial');
    }
  };

  const isPlaying = status === 'waiting';
  const hasWon = rollResult !== null && rollResult >= target;

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
      <div className="flex-1 flex flex-col items-center justify-center bg-panel border-2 border-[#1a2d37] rounded-lg p-8 min-h-[500px] gap-12">
        {/* The Dice Value Display */}
        <div className="relative w-full max-w-3xl flex flex-col items-center gap-12">

          <div className="text-center h-20 flex items-center justify-center">
            {rollResult !== null && status === 'finished' ? (
              hasWon ? (
                <span className="text-5xl font-black text-[#00e701] drop-shadow-[0_0_15px_rgba(0,231,1,0.5)]">
                  ${payout !== null ? payout.toFixed(2) : "0.00"}
                </span>
              ) : (
                <span className="text-5xl font-black text-[#ed4141] drop-shadow-[0_0_15px_rgba(237,65,65,0.5)]">
                  You lost
                </span>
              )
            ) : (
              <span className="text-6xl font-black text-white opacity-80">
                0.00
              </span>
            )}
          </div>

          {/* Slider Container */}
          <div className="w-full relative px-6">
            <div className="relative w-full h-10 flex items-center">
              {/* Range Background */}
              <div
                className="absolute left-0 right-0 h-4 rounded-full overflow-hidden"
                style={{
                  background: `linear-gradient(to right, #ed4141 ${target}%, #00e701 ${target}%)`
                }}
              />

              {/* Roll Result Marker */}
              {rollResult !== null && status === 'finished' && (
                <div
                  className="absolute z-20 flex flex-col items-center justify-start transition-all duration-500 ease-out pointer-events-none"
                  style={{
                    left: `calc(${rollResult}%)`,
                    transform: 'translateX(-50%)',
                    top: 'calc(50% + 4px)'
                  }}
                >
                  <div className="w-[3px] h-4 bg-white mb-1 rounded-full shadow-md"></div>
                  <div className={`text-white text-xs font-black px-2 py-1 rounded shadow-xl whitespace-nowrap relative ${hasWon ? 'bg-[#00e701]' : 'bg-[#ed4141]'}`}>
                    {/* little triangle pointing up */}
                    <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent ${hasWon ? 'border-b-[#00e701]' : 'border-b-[#ed4141]'}`}></div>
                    {rollResult.toFixed(2)}
                  </div>
                </div>
              )}

              {/* Range Slider */}
              <input
                type="range"
                min="2"
                max="98"
                step="1"
                disabled={isPlaying}
                value={target}
                onChange={(e) => handleTargetChange(Number(e.target.value))}
                className="w-full absolute inset-0 z-10 appearance-none bg-transparent h-10 cursor-pointer 
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 
                          [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-md [&::-webkit-slider-thumb]:shadow-lg
                          [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:h-8 
                          [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-md [&::-moz-range-thumb]:shadow-lg"
              />
            </div>

            <div className="flex justify-between w-full mt-2 text-sm font-bold text-gray-400">
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>

          {/* Three Input Readouts: Multiplier, Target / Roll Over, Win Chance */}
          <div className="flex gap-4 w-full">
            <div className="flex-1 bg-[#0f212e] rounded-md border-2 border-[#1a2d37] focus-within:border-gray-500 overflow-hidden flex items-center justify-between px-3 h-11">
              <div className="flex items-center">
                <input
                  type="number"
                  disabled={isPlaying}
                  value={multiplier}
                  onChange={(e) => handleMultiplierChange(Number(e.target.value))}
                  className="w-16 bg-transparent text-sm text-white font-bold focus:outline-none disabled:opacity-50"
                  step="0.01"
                />
                <span className="text-sm font-bold text-white">×</span>
              </div>
              <label className="text-xs font-bold text-gray-500 pointer-events-none select-none hidden md:block">Multiplier</label>
            </div>

            <div className="flex-1 bg-[#0f212e] rounded-md border-2 border-[#1a2d37] focus-within:border-gray-500 overflow-hidden flex items-center justify-between px-3 h-11">
              <div className="flex items-center">
                <input
                  type="number"
                  disabled={isPlaying}
                  value={target}
                  onChange={(e) => handleTargetChange(Number(e.target.value))}
                  className="w-16 bg-transparent text-sm text-white font-bold focus:outline-none disabled:opacity-50"
                  step="0.01"
                />
              </div>
              <label className="text-xs font-bold text-gray-500 pointer-events-none select-none hidden md:block">Roll Over</label>
            </div>

            <div className="flex-1 bg-[#0f212e] rounded-md border-2 border-[#1a2d37] focus-within:border-gray-500 overflow-hidden flex items-center justify-between px-3 h-11">
              <div className="flex items-center">
                <input
                  type="number"
                  disabled={isPlaying}
                  value={winChance}
                  onChange={(e) => handleWinChanceChange(Number(e.target.value))}
                  className="w-16 bg-transparent text-sm text-white font-bold focus:outline-none disabled:opacity-50"
                  step="0.01"
                />
                <span className="text-sm font-bold text-white">%</span>
              </div>
              <label className="text-xs font-bold text-gray-500 pointer-events-none select-none hidden md:block">Win Chance</label>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
