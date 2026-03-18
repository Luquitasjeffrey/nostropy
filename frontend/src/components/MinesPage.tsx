import { useState, useEffect } from 'react';
import { MinesGrid, type GameStatus, type CellAnswer } from './mines/MinesGrid';
import { MinesControls } from './mines/MinesControls';
import { motion } from 'framer-motion';
import { ProvablyFair } from './ui/ProvablyFair';

import { API_URL as BASE_API_URL } from '../config';

interface MinesPageProps {
  playerPubkey: string;
  allBalances: any[];
  prices: Record<string, number>;
  onGameEnd: () => void;
}

export default function MinesPage({
  playerPubkey,
  allBalances,
  prices,
  onGameEnd,
}: MinesPageProps) {
  const API_URL = `${BASE_API_URL}/api`;
  const [currencySymbol, setCurrencySymbol] = useState('BTC');
  const price = prices[currencySymbol] || 1;
  const [wager, setWager] = useState(10);
  const [gameId, setGameId] = useState<string | null>(null);
  const [serverSeedHash, setServerSeedHash] = useState<string | null>(null);
  const [serverSeedShown, setServerSeedShown] = useState<string | null>(null);
  const [clientSeed, setClientSeed] = useState('');
  const [minesCount, setMinesCount] = useState(5);

  const [status, setStatus] = useState<GameStatus>('initial');

  useEffect(() => {
    const storedWager = localStorage.getItem('wagerAmount');
    if (storedWager) setWager(Number(storedWager));
  }, []);

  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [clickedIndices, setClickedIndices] = useState<number[]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [payout, setPayout] = useState<number | null>(null);
  const [boardAnswer, setBoardAnswer] = useState<CellAnswer[] | null>(null);

  async function startGame() {
    if (!playerPubkey || wager <= 0) return;
    localStorage.setItem('playerPubkey', playerPubkey);
    localStorage.setItem('wagerAmount', wager.toString());

    // Reset state for new round
    setRevealedIndices([]);
    setClickedIndices([]);
    setBoardAnswer(null);
    setMultiplier(1);
    setPayout(null);
    setServerSeedHash(null);
    setServerSeedShown(null);

    // 2. Convert to smallest unit: crypto amount * 10^decimals
    const decimals = currencySymbol === 'BTC' ? 8 : 6;
    const cryptoAmount = wager / price;
    const wagerInt = Math.floor(cryptoAmount * Math.pow(10, decimals));

    console.log(
      `Starting game with USD: $${wager}, Crypto Symbol: ${currencySymbol}, Price: ${price}, Crypto Amount: ${cryptoAmount}, Wager Int (smallest units): ${wagerInt}`
    );

    const res = await fetch(`${API_URL}/games/mines/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerPubkey,
        wagerAmount: wagerInt,
        minesCount,
        currencySymbol,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setGameId(data.gameId);
      setServerSeedHash(data.serverSeedHash);
      setStatus('waiting');
      const rand = Array.from({ length: 16 })
        .map(() =>
          Math.floor(Math.random() * 256)
            .toString(16)
            .padStart(2, '0')
        )
        .join('');
      setClientSeed(rand);
      localStorage.setItem('clientSeed', rand);
      onGameEnd(); // Refresh balance after wager deduction
    } else {
      alert(data.error || 'error starting game');
    }
  }

  async function submitClientSeed() {
    if (!gameId || !clientSeed) return;
    localStorage.setItem('clientSeed', clientSeed);
    const res = await fetch(`${API_URL}/games/mines/set_client_seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerPubkey, gameId, clientSeed }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setStatus('active');
    } else {
      alert(data.error || 'error setting client seed');
    }
  }

  /* Automatically submit the seed and transition to active immediately after starting a game for a smoother experience */
  useEffect(() => {
    if (status === 'waiting' && clientSeed && gameId) {
      submitClientSeed();
    }
  }, [status, clientSeed, gameId]);

  async function revealCell(index: number) {
    if (!gameId || status !== 'active') return;
    const res = await fetch(`${API_URL}/games/mines/reveal_one`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerPubkey, gameId, index }),
    });
    const data = await res.json();
    if (data.success) {
      setRevealedIndices((r) => [...r, index]);
      setMultiplier(data.newMultiplier);
    } else {
      setStatus('lost');
      setBoardAnswer(data.board);
      if (data.clickedIndices) setClickedIndices(data.clickedIndices);
      if (data.serverSeed) setServerSeedShown(data.serverSeed.seed || data.serverSeed);
      onGameEnd(); // Balance doesn't change on loss (already deducted), but good to sync
    }
  }

  async function cashOut() {
    if (!gameId || status !== 'active') return;
    const res = await fetch(`${API_URL}/games/mines/cash_out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerPubkey, gameId }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setStatus('cashed');
      // The backend returns payout in smallest crypto units. Convert back to USD for display.
      const decimals = currencySymbol === 'BTC' ? 8 : 6;
      const cryptoPayout = data.payout / Math.pow(10, decimals);
      const usdPayout = cryptoPayout * price;
      setPayout(usdPayout);
      setBoardAnswer(data.board);
      if (data.clickedIndices) setClickedIndices(data.clickedIndices);
      setServerSeedHash(null);
      setServerSeedShown(data.serverSeed?.seed || '');
      onGameEnd(); // Refresh balance after payout
    } else {
      alert(data.error || 'error cashing out');
    }
  }

  const canCash = status === 'active' && revealedIndices.length > 0;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center p-4">
      {/* Main Game Interface Layout */}
      <div className="flex flex-col lg:flex-row w-full bg-[#0f212e] rounded-xl overflow-hidden shadow-2xl">
        {/* Left Sidebar: Controls */}
        <div className="lg:w-80 border-r-2 border-panel bg-panel shrink-0">
          <MinesControls
            wager={wager}
            setWager={setWager}
            minesCount={minesCount}
            setMinesCount={setMinesCount}
            startGame={startGame}
            cashOut={cashOut}
            status={status}
            multiplier={multiplier}
            canCash={canCash}
            payout={payout}
            currencySymbol={currencySymbol}
            setCurrencySymbol={setCurrencySymbol}
            allBalances={allBalances}
            prices={prices}
          />
        </div>

        {/* Right Area: Game Board */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center bg-background min-h-[500px]">
          {/* End Game / Win State Overlays */}
          {(status === 'cashed' || status === 'lost') && (
            <div
              className={`mb-6 p-4 w-full max-w-[500px] text-center rounded-lg flex flex-col items-center shadow-lg border-2 ${status === 'cashed' ? 'border-primary bg-primary/10 text-primary' : 'border-danger bg-danger/10 text-danger'} `}
            >
              <span className="text-lg font-bold">
                {status === 'cashed' ? 'You Won!' : 'You Hit a Bomb!'}
              </span>
              {status === 'cashed' && (
                <span className="text-3xl font-extrabold mt-1">${payout?.toFixed(2)}</span>
              )}
            </div>
          )}

          {/* Active Game Multiplier Display */}
          {status === 'active' && (
            <div className="mb-6 flex flex-col items-center h-[76px] justify-center">
              <span className="text-gray-400 text-sm font-bold mb-1">Current Multiplier</span>
              <motion.div
                key={multiplier}
                initial={{ scale: 1.5, color: '#00e701' }}
                animate={{ scale: 1, color: '#ffffff' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="text-4xl font-black drop-shadow-[0_0_8px_rgba(0,231,1,0.5)]"
              >
                {multiplier.toFixed(2)}x
              </motion.div>
            </div>
          )}

          <MinesGrid
            status={status}
            revealedIndices={revealedIndices}
            clickedIndices={clickedIndices}
            boardAnswer={boardAnswer}
            onReveal={revealCell}
          />

          {/* Provably Fair Info Footer */}
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
