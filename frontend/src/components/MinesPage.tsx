import { useState, useEffect } from "react";
import { MinesGrid, type GameStatus, type CellAnswer } from "./mines/MinesGrid";
import { MinesControls } from "./mines/MinesControls";
import { Copy, KeyRound, Dices } from "lucide-react";
import { Input } from "./ui/Input";

export default function MinesPage() {
  const [playerPubkey, setPlayerPubkey] = useState('');
  const [wager, setWager] = useState(10);
  const [balance, setBalance] = useState(0); // dummy balance display
  const [gameId, setGameId] = useState<string | null>(null);
  const [serverSeedHash, setServerSeedHash] = useState<string | null>(null);
  const [serverSeedShown, setServerSeedShown] = useState<string | null>(null);
  const [clientSeed, setClientSeed] = useState('');
  const [minesCount, setMinesCount] = useState(5);

  // helper to copy
  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const truncate = (s: string, len = 8) =>
    s.length > len * 2 ? `${s.slice(0, len)}...${s.slice(-len)}` : s;

  const [status, setStatus] = useState<GameStatus>('initial');

  useEffect(() => {
    const storedPub = localStorage.getItem('playerPubkey');
    if (storedPub) setPlayerPubkey(storedPub);
    const storedWager = localStorage.getItem('wagerAmount');
    if (storedWager) setWager(Number(storedWager));
    const storedBalance = localStorage.getItem('balance');
    if (storedBalance) setBalance(Number(storedBalance));
    else setBalance(1000);
  }, []);

  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [payout, setPayout] = useState<number | null>(null);
  const [boardAnswer, setBoardAnswer] = useState<CellAnswer[] | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  async function startGame() {
    if (!playerPubkey || wager <= 0) return;
    localStorage.setItem('playerPubkey', playerPubkey);
    localStorage.setItem('wagerAmount', wager.toString());

    // Reset state for new round
    setRevealedIndices([]);
    setBoardAnswer(null);
    setMultiplier(1);
    setPayout(null);
    setServerSeedHash(null);
    setServerSeedShown(null);

    const res = await fetch(`${API_URL}/games/mines/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerPubkey, wagerAmount: wager, minesCount }),
    });
    const data = await res.json();
    if (res.ok) {
      setGameId(data.gameId);
      setServerSeedHash(data.serverSeedHash);
      setStatus('waiting');
      const rand = Array.from({ length: 16 })
        .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0'))
        .join('');
      setClientSeed(rand);
      localStorage.setItem('clientSeed', rand); // immediately store the new random seed
      setBalance((b) => b - wager);
      localStorage.setItem('balance', (balance - wager).toString());
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
      if (data.serverSeed) setServerSeedShown(data.serverSeed.seed || data.serverSeed);
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
      setPayout(data.payout);
      setBoardAnswer(data.board);
      setServerSeedHash(null);
      setServerSeedShown(data.serverSeed?.seed || '');
      setBalance((b) => b + data.payout);
      localStorage.setItem('balance', (balance + data.payout).toString());
    } else {
      alert(data.error || 'error cashing out');
    }
  }

  const canCash = status === 'active' && revealedIndices.length > 0;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center p-4">

      {/* Top Navbar / State info */}
      <div className="w-full mb-6 flex items-center justify-between border-b-2 border-panel pb-4">
        <div className="flex items-center space-x-2 text-primary font-bold text-2xl">
          <Dices className="w-8 h-8" />
          <span>Mines</span>
        </div>
        <div className="flex space-x-4">
          <Input
            value={playerPubkey}
            onChange={e => setPlayerPubkey(e.target.value)}
            placeholder="Pubkey ID"
            icon={<KeyRound size={16} />}
            className="w-40"
          />
          <div className="flex flex-col items-end justify-center px-4 py-1 bg-panel rounded-md border-2 border-[#1a2d37]">
            <span className="text-xs text-gray-400">Balance</span>
            <span className="text-sm text-white font-bold">${balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

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
          />
        </div>

        {/* Right Area: Game Board */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center bg-background min-h-[500px]">

          {/* End Game / Win State Overlays */}
          {(status === 'cashed' || status === 'lost') && (
            <div className={`mb-6 p-4 rounded-lg flex flex-col items-center shadow-lg border-2 ${status === 'cashed' ? 'border-primary bg-primary/10 text-primary' : 'border-danger bg-danger/10 text-danger'} `}>
              <span className="text-lg font-bold">
                {status === 'cashed' ? 'You Won!' : 'You Hit a Bomb!'}
              </span>
              {status === 'cashed' && (
                <span className="text-3xl font-extrabold mt-1">${payout?.toFixed(2)}</span>
              )}
            </div>
          )}

          <MinesGrid
            status={status}
            revealedIndices={revealedIndices}
            boardAnswer={boardAnswer}
            onReveal={revealCell}
          />

          {/* Provably Fair Info Footer */}
          {gameId && (
            <div className="mt-8 text-xs text-gray-500 flex flex-col items-center space-y-2 opacity-70 w-full max-w-[500px]">
              <div className="flex items-center space-x-2">
                <span>Game ID</span>
                <span className="text-gray-400 font-mono truncate max-w-[120px]">{truncate(gameId)}</span>
                <button onClick={() => copyText(gameId)} className="hover:text-white transition-colors"><Copy size={12} /></button>
              </div>
              {serverSeedHash && (
                <div className="flex items-center space-x-2">
                  <span>Server Seed Hash</span>
                  <span className="text-gray-400 font-mono truncate max-w-[120px]">{truncate(serverSeedHash)}</span>
                  <button onClick={() => copyText(serverSeedHash)} className="hover:text-white transition-colors"><Copy size={12} /></button>
                </div>
              )}
              {serverSeedShown && (
                <div className="flex items-center space-x-2">
                  <span>Server Seed</span>
                  <span className="text-gray-400 font-mono text-[10px] break-all max-w-[300px] text-center">{serverSeedShown}</span>
                  <button onClick={() => copyText(serverSeedShown)} className="hover:text-white transition-colors shrink-0"><Copy size={12} /></button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
