import { useState, useEffect } from 'react';
import { MinesGrid, type GameStatus, type CellAnswer } from './mines/MinesGrid';
import { MinesControls } from './mines/MinesControls';
import { Copy, KeyRound, Dices, ShieldCheck } from 'lucide-react';
import { Input } from './ui/Input';
import { motion } from 'framer-motion';
import { Modal } from './ui/Modal';

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

  const [status, setStatus] = useState<GameStatus>('initial');
  const [isFairnessModalOpen, setIsFairnessModalOpen] = useState(false);

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
  const [clickedIndices, setClickedIndices] = useState<number[]>([]);
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
    setClickedIndices([]);
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
        .map(() =>
          Math.floor(Math.random() * 256)
            .toString(16)
            .padStart(2, '0')
        )
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
      if (data.clickedIndices) setClickedIndices(data.clickedIndices);
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
      if (data.clickedIndices) setClickedIndices(data.clickedIndices);
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
            onChange={(e) => setPlayerPubkey(e.target.value)}
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
          {gameId && (
            <div className="mt-8 flex flex-col items-center w-full max-w-[500px]">
              <button
                onClick={() => setIsFairnessModalOpen(true)}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors text-xs font-bold mb-4 bg-panel px-4 py-2 rounded-full border-2 border-[#1a2d37] shadow-lg hover:bg-[#2c4757] active:scale-95"
              >
                <ShieldCheck size={14} className="text-primary" />
                <span>Provably Fair</span>
              </button>

              <Modal
                isOpen={isFairnessModalOpen}
                onClose={() => setIsFairnessModalOpen(false)}
                title="Provably Fair Keys"
              >
                <div className="text-sm text-gray-400 flex flex-col space-y-5">
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
                      Game ID
                    </span>
                    <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-[#1a2d37]">
                      <span className="text-gray-300 font-mono text-xs truncate max-w-[240px]">
                        {gameId}
                      </span>
                      <button
                        onClick={() => copyText(gameId)}
                        className="hover:text-primary transition-colors ml-2"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>

                  {clientSeed && (
                    <div className="flex flex-col space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
                        Client Seed
                      </span>
                      <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-[#1a2d37]">
                        <span className="text-gray-300 font-mono text-xs truncate max-w-[240px]">
                          {clientSeed}
                        </span>
                        <button
                          onClick={() => copyText(clientSeed)}
                          className="hover:text-primary transition-colors ml-2"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {serverSeedHash && (
                    <div className="flex flex-col space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
                        Server Seed Hash
                      </span>
                      <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-[#1a2d37]">
                        <span className="text-gray-300 font-mono text-xs truncate max-w-[240px]">
                          {serverSeedHash}
                        </span>
                        <button
                          onClick={() => copyText(serverSeedHash)}
                          className="hover:text-primary transition-colors ml-2"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {serverSeedShown && (
                    <div className="flex flex-col space-y-1 border-t border-[#1a2d37] pt-4 mt-2">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-primary">
                        Server Seed (Revealed)
                      </span>
                      <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-primary/30">
                        <span className="text-gray-300 font-mono text-xs break-all">
                          {serverSeedShown}
                        </span>
                        <button
                          onClick={() => copyText(serverSeedShown)}
                          className="hover:text-primary transition-colors ml-2 shrink-0"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-gray-600 italic text-center pt-2">
                    Verify this round's fairness on any independent SHA-256 tool.
                  </div>
                </div>
              </Modal>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
