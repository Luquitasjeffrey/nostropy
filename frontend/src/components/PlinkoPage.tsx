import { useState, useCallback } from 'react';
import { Button } from './ui/Button';
import { WagerInput } from './ui/WagerInput';
import { ProvablyFair } from './ui/ProvablyFair';
import { motion, AnimatePresence } from 'framer-motion';

interface PlinkoPageProps {
  playerPubkey: string;
  allBalances: any[];
  prices: Record<string, number>;
  onGameEnd: () => void;
}

const MEDIUM_MULTIPLIERS: Record<number, number[]> = {
  8: [13, 3, 1.5, 1, 0.4, 1, 1.5, 3, 13],
  9: [18, 5, 2, 1.2, 0.6, 0.4, 0.6, 1.2, 2, 5, 18],
  10: [22, 8, 3, 1.4, 0.9, 0.4, 0.9, 1.4, 3, 8, 22],
  11: [24, 10, 4, 1.8, 1, 0.6, 0.4, 0.6, 1, 1.8, 4, 10, 24],
  12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
  13: [43, 18, 6, 3, 1.3, 0.7, 0.4, 0.4, 0.7, 1.3, 3, 6, 18, 43],
  14: [41, 14, 5.2, 2.5, 1.3, 0.6, 0.3, 0.2, 0.3, 0.6, 1.3, 2.5, 5.2, 14, 41],
  15: [89, 23, 8, 4, 1.8, 0.8, 0.5, 0.3, 0.5, 0.8, 1.8, 4, 8, 23, 89],
  16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
};

const getColorForMultiplier = (mult: number) => {
  if (mult >= 100) return '#ff0000';
  if (mult >= 20) return '#ff3300';
  if (mult >= 5) return '#ff6600';
  if (mult >= 2) return '#ff9900';
  if (mult > 1) return '#ffcc00';
  if (mult === 1) return '#ffff00';
  return '#cccc00';
};

interface Ball {
  id: string;
  path: { x: number; y: number }[];
  duration: number;
}

export default function PlinkoPage({
  playerPubkey,
  allBalances,
  prices,
  onGameEnd,
}: PlinkoPageProps) {
  const [currencySymbol, setCurrencySymbol] = useState('BTC');
  const [wager, setWager] = useState(10);
  const [risk, setRisk] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [rows, setRows] = useState<number>(16);

  // Provably fair mock (shows last played game)
  const [gameId, setGameId] = useState<string | null>(null);
  const [clientSeed, setClientSeed] = useState<string | null>(null);
  const [serverSeedHash, setServerSeedHash] = useState<string | null>(null);
  const [serverSeedShown, setServerSeedShown] = useState<string | null>(null);

  const GAP_X = 36;
  const GAP_Y = 32;
  const BALL_SIZE = 14;
  const PEG_SIZE = 8;

  const multipliers = MEDIUM_MULTIPLIERS[rows] || MEDIUM_MULTIPLIERS[16];

  const [balls, setBalls] = useState<Ball[]>([]);
  // Store which slots are currently "active" (highlighted) by recently landed balls
  const [activeSlots, setActiveSlots] = useState<Record<number, number>>({});

  const addActiveSlot = useCallback((slotIndex: number) => {
    setActiveSlots((prev) => ({
      ...prev,
      [slotIndex]: (prev[slotIndex] || 0) + 1,
    }));
    // Remove highlight after 500ms
    setTimeout(() => {
      setActiveSlots((prev) => {
        const current = prev[slotIndex];
        if (!current || current <= 1) {
          const newSlots = { ...prev };
          delete newSlots[slotIndex];
          return newSlots;
        }
        return {
          ...prev,
          [slotIndex]: current - 1,
        };
      });
    }, 500);
  }, []);

  const startGame = async () => {
    if (!playerPubkey || wager <= 0) return;

    // MOCK: Generate seeds and game ID for this specific drop
    const mockGameId = Math.random().toString(36).substring(2, 10);
    const mockClientSeed = Math.random().toString(36).substring(2, 15);
    const mockServerSeed = Math.random().toString(36).substring(2, 30);
    const mockHash = btoa(mockServerSeed).substring(0, 32);

    setGameId(mockGameId);
    setServerSeedHash(mockHash);
    setClientSeed(mockClientSeed);
    setServerSeedShown(null); // Wait to reveal

    onGameEnd(); // Mock deduction

    let currentPos = 0;
    const newPathConfig = [];

    // 0. Start slightly above the top peg (Peak)
    newPathConfig.push({ x: 0, y: -GAP_Y + 10 });

    for (let r = 0; r <= rows; r++) {
      const hitX = (currentPos - r / 2) * GAP_X;
      const hitY = r * GAP_Y;

      // Add the hit (collision with peg)
      newPathConfig.push({ x: hitX, y: hitY - PEG_SIZE / 2 });

      if (r < rows) {
        // Decide left/right for the NEXT row
        const dir = Math.random() > 0.5 ? 1 : 0;
        currentPos += dir;

        const nextHitX = (currentPos - (r + 1) / 2) * GAP_X;
        const nextHitY = (r + 1) * GAP_Y;

        // Peak (bounce) between current hit and next hit
        const peakX = (hitX + nextHitX) / 2;
        const peakY = hitY - 14;
        newPathConfig.push({ x: peakX, y: peakY });
      }
    }

    // Final drop into the multiplier slot
    const finalX = (currentPos - rows / 2) * GAP_X;
    const finalY = rows * GAP_Y + 16;
    newPathConfig.push({ x: finalX, y: finalY });

    const newBall: Ball = {
      id: mockGameId + '-' + Date.now(),
      path: newPathConfig,
      duration: newPathConfig.length * 0.15,
    };

    setBalls((prev) => [...prev, newBall]);

    // When the ball lands
    setTimeout(() => {
      addActiveSlot(currentPos);
      setServerSeedShown(mockServerSeed); // Reveal seed for this latest finished ball
      onGameEnd(); // Mock payout update

      // Remove ball after a slight delay to let the user see it land
      setTimeout(() => {
        setBalls((prev) => prev.filter((b) => b.id !== newBall.id));
      }, 500);

    }, newBall.duration * 1000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-6">
      {/* Sidebar Controls */}
      <div className="w-full md:w-80 flex-shrink-0">
        <div className="flex flex-col gap-4 bg-panel min-w-[280px] p-5 rounded-lg border-2 border-[#1a2d37] shadow-xl h-full">
          <div className="flex-1 space-y-4 pt-2">
            <WagerInput
              wager={wager}
              setWager={setWager}
              currencySymbol={currencySymbol}
              setCurrencySymbol={setCurrencySymbol}
              allBalances={allBalances}
              prices={prices}
              disabled={false} // Never disabled so we can span parallel balls
            />

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Risk
              </label>
              <select
                value={risk}
                onChange={(e) => setRisk(e.target.value as any)}
                className="w-full bg-[#0f212e] border-2 border-[#1a2d37] focus:border-primary focus:outline-none text-white font-bold p-3 rounded-lg appearance-none cursor-pointer hover:border-gray-500 transition-colors"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Rows
              </label>
              <select
                value={rows}
                onChange={(e) => {
                  setRows(Number(e.target.value));
                  setBalls([]); // Clear active balls on board resize
                }}
                className="w-full bg-[#0f212e] border-2 border-[#1a2d37] focus:border-primary focus:outline-none text-white font-bold p-3 rounded-lg appearance-none cursor-pointer hover:border-gray-500 transition-colors"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
              >
                {[8, 9, 10, 11, 12, 13, 14, 15, 16].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 mt-auto">
              <Button
                className="w-full text-lg shadow-[0_4px_0_0_#00c700] hover:shadow-[0_2px_0_0_#00c700] active:shadow-[0_0px_0_0_#00c700] active:translate-y-1 transition-all"
                size="lg"
                onClick={startGame}
              >
                Play
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center justify-between bg-panel border-2 border-[#1a2d37] rounded-lg p-6 md:p-10 min-h-[750px] overflow-hidden relative">

        {/* Board container forced higher */}
        <div className="relative w-full flex-1 flex justify-center mt-6">
          <div className="relative w-0 h-0 flex justify-center flex-col items-center">

            {/* Render Pegs */}
            {Array.from({ length: rows }).map((_, r) => {
              return Array.from({ length: r + 1 }).map((_, c) => {
                const x = (c - r / 2) * GAP_X;
                const y = r * GAP_Y;
                return (
                  <div
                    key={`peg-${r}-${c}`}
                    className="absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10"
                    style={{
                      width: `${PEG_SIZE}px`,
                      height: `${PEG_SIZE}px`,
                      left: `calc(50% + ${x}px)`,
                      top: `calc(${y}px)`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  ></div>
                );
              });
            })}

            {/* Render Baskets / Multipliers */}
            <div
              className="absolute flex items-center justify-between z-0"
              style={{
                left: '50%',
                transform: 'translateX(-50%)',
                top: `calc(${rows * GAP_Y + 12}px)`,
                width: `${(rows + 1) * GAP_X}px`,
                gap: '3px'
              }}
            >
              {multipliers.map((mult, c) => {
                const isActive = !!activeSlots[c];
                return (
                  <motion.div
                    key={`mult-${c}`}
                    animate={{
                      y: isActive ? [0, 8, 0] : 0,
                      filter: isActive ? 'brightness(1.5)' : 'brightness(1)',
                      scale: isActive ? [1, 1.1, 1] : 1
                    }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 text-center py-2 md:py-3 rounded opacity-90 md:rounded-lg font-black text-[9px] sm:text-[10px] md:text-sm text-black border-b-[3px] border-opacity-50 shadow-md"
                    style={{
                      backgroundColor: getColorForMultiplier(mult),
                      borderColor: 'rgba(0,0,0,0.4)',
                    }}
                  >
                    {mult}x
                  </motion.div>
                );
              })}
            </div>

            {/* Render the Balls with physics bounces */}
            <AnimatePresence>
              {balls.map((ball) => (
                <motion.div
                  key={ball.id}
                  className="absolute rounded-full bg-[#ff0055] shadow-[0_0_15px_#ff0055] border-2 border-white z-30"
                  style={{
                    width: `${BALL_SIZE}px`,
                    height: `${BALL_SIZE}px`,
                    top: 0,
                    left: '50%',
                    x: '-50%',
                    y: '-50%' // Start centered on intended coordinate
                  }}
                  initial={{
                    x: `calc(-50% + ${ball.path[0].x}px)`,
                    y: `calc(-50% + ${ball.path[0].y}px)`,
                    opacity: 1,
                    scale: 1,
                  }}
                  animate={{
                    x: ball.path.map((p) => `calc(-50% + ${p.x}px)`),
                    y: ball.path.map((p) => `calc(-50% + ${p.y}px)`),
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.5,
                    transition: { duration: 0.2 },
                  }}
                  transition={{
                    duration: ball.duration,
                    // For physical bounces: easeIn when falling to peg, easeOut when bouncing up off peg
                    // Since ballPath has a peak at 0, hit at 1, peak at 2, hit at 3...
                    // Even -> Odd (falling): easeIn. Odd -> Even (rising): easeOut.
                    ease: ball.path.slice(1).map((_, i) => (i % 2 === 0 ? 'easeIn' : 'easeOut')),
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Provably Fair at the very bottom */}
        <div className="mt-60 w-full pt-8 border-t border-[#1a2d37]/50">
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
