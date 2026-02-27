"use client";

import { useState, useEffect } from "react";

export default function MinesPage() {
  const [playerPubkey, setPlayerPubkey] = useState('');
  const [wager, setWager] = useState(0);
  const [balance, setBalance] = useState(0); // dummy balance display
  const [gameId, setGameId] = useState<string | null>(null);
  const [serverSeedHash, setServerSeedHash] = useState<string | null>(null);
  const [clientSeed, setClientSeed] = useState('');
  const [status, setStatus] = useState<'initial' | 'waiting' | 'active' | 'lost' | 'cashed'>('initial');

  // on mount, try to restore settings and generate default seed
  useEffect(() => {
    const storedPub = localStorage.getItem('playerPubkey');
    if (storedPub) setPlayerPubkey(storedPub);
    const storedSeed = localStorage.getItem('clientSeed');
    if (storedSeed) {
      setClientSeed(storedSeed);
    } else {
      // generate random 32-char hex
      const rand = Array.from({ length: 16 })
        .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0'))
        .join('');
      setClientSeed(rand);
    }
    // dummy balance for display
    setBalance(1000);
  }, []);

  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [payout, setPayout] = useState<number | null>(null);
  const [boardAnswer, setBoardAnswer] = useState<('gem'|'bomb')[] | null>(null);

  async function startGame() {
    if (!playerPubkey || wager <= 0) return;
    // persist pubkey and seed locally
    localStorage.setItem('playerPubkey', playerPubkey);
    localStorage.setItem('clientSeed', clientSeed);
    const res = await fetch('/api/games/mines/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerPubkey, wagerAmount: wager }),
    });
    const data = await res.json();
    if (res.ok) {
      setGameId(data.gameId);
      setServerSeedHash(data.serverSeedHash);
      setStatus('waiting');
    } else {
      alert(data.error || 'error starting game');
    }
  }

  async function submitClientSeed() {
    if (!gameId || !clientSeed) return;
    // update local seed if modified
    localStorage.setItem('clientSeed', clientSeed);
    const res = await fetch('/api/games/mines/set_client_seed', {
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

  async function revealCell(index: number) {
    if (!gameId) return;
    const res = await fetch('/api/games/mines/reveal_one', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerPubkey, gameId, index }),
    });
    const data = await res.json();
    if (data.success) {
      setRevealedIndices((r) => [...r, index]);
      setMultiplier(data.newMultiplier);
    } else {
      // lose
      setStatus('lost');
      setBoardAnswer(data.board);
      alert('BOOM! You hit a bomb.');
    }
  }

  async function cashOut() {
    if (!gameId) return;
    const res = await fetch('/api/games/mines/cash_out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerPubkey, gameId }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setStatus('cashed');
      setPayout(data.payout);
    } else {
      alert(data.error || 'error cashing out');
    }
  }

  const canCash = status === 'active' && revealedIndices.length > 0;

  function renderCell(i: number) {
    const revealed = revealedIndices.includes(i) || status === 'lost' || status === 'cashed';
    const answer = boardAnswer ? boardAnswer[i] : null;
    let content = '';
    if (!revealed) {
      content = '';
    } else if (answer === 'bomb') {
      content = '💣';
    } else if (answer === 'gem') {
      content = '💎';
    } else {
      // user revealed manually
      content = '💎';
    }

    return (
      <button
        key={i}
        className="w-12 h-12 border flex items-center justify-center"
        disabled={revealed || status !== 'active'}
        onClick={() => revealCell(i)}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Mines Game</h1>

      {status === 'initial' && (
        <div className="flex flex-col gap-2 max-w-xs">
          <label className="flex flex-col">
            Player pubkey
            <input
              placeholder="Player pubkey"
              value={playerPubkey}
              onChange={(e) => setPlayerPubkey(e.target.value)}
              className="border p-1 font-bold text-black"
            />
          </label>
          <span className="text-sm text-gray-700">Balance: <strong>{balance}</strong></span>
          <label className="flex flex-col">
            Wager amount
            <input
              type="number"
              placeholder="Wager amount"
              value={wager}
              onChange={(e) => setWager(Number(e.target.value))}
              className="border p-1 font-bold text-black"
            />
          </label>
          <button onClick={startGame} className="bg-blue-500 text-white py-1 px-2 rounded">
            Start Game
          </button>
        </div>
      )}

      {status === 'waiting' && (
        <div className="flex flex-col gap-2 max-w-xs">
          <p>Server seed hash: {serverSeedHash}</p>
          <label className="flex flex-col">
            Client seed (32‑hex chars)
            <input
              placeholder="Client seed (hex)"
              value={clientSeed}
              onChange={(e) => setClientSeed(e.target.value)}
              className="border p-1"
            />
          </label>
          <p className="text-sm text-gray-600">
            A random seed has been generated for you. You may modify it before submitting.
          </p>
          <button onClick={submitClientSeed} className="bg-green-500 text-white py-1 px-2 rounded">
            Submit Seed
          </button>
        </div>
      )}

      {(status === 'active' || status === 'lost' || status === 'cashed') && (
        <div className="mt-4">
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 25 }).map((_, i) => renderCell(i))}
          </div>
          <p className="mt-2">Multiplier: {multiplier.toFixed(2)}</p>
          {canCash && (
            <button onClick={cashOut} className="bg-yellow-500 text-white py-1 px-2 rounded mt-2">
              Cash Out
            </button>
          )}
          {status === 'cashed' && <p className="mt-2">Payout: {payout}</p>}
        </div>
      )}
    </div>
  );
}
