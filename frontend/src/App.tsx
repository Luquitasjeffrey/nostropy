import { useState, useEffect } from 'react';
import MinesPage from './components/MinesPage';
import { KeyRound } from 'lucide-react';
import { Input } from './components/ui/Input';
import logoImg from './assets/logo.png';

function App() {
  const [playerPubkey, setPlayerPubkey] = useState('');
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const storedPub = localStorage.getItem('playerPubkey');
    if (storedPub) setPlayerPubkey(storedPub);

    const storedBalance = localStorage.getItem('balance');
    if (storedBalance) setBalance(Number(storedBalance));
    else setBalance(1000);
  }, []);

  return (
    <div className="min-h-screen bg-[#06141d] flex flex-col items-center">
      {/* Global Header */}
      <header className="w-full max-w-6xl mx-auto px-4 py-4 flex items-center justify-between border-b-2 border-panel bg-background shadow-lg">
        <div className="flex items-center space-x-3">
          <img
            src={logoImg}
            alt="Nostropy Logo"
            className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]"
          />
          <span className="text-white font-black text-3xl tracking-tighter uppercase">
            Nostr<span className="text-primary">opy</span>
          </span>
        </div>

        <div className="flex items-center space-x-6">
          <Input
            value={playerPubkey}
            onChange={(e) => {
              setPlayerPubkey(e.target.value);
              localStorage.setItem('playerPubkey', e.target.value);
            }}
            placeholder="Pubkey ID"
            icon={<KeyRound size={16} />}
            className="w-48 hidden md:flex"
          />

          <div className="flex flex-col items-end justify-center px-5 py-1.5 bg-panel rounded-lg border-2 border-[#1a2d37] shadow-inner">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
              Balance
            </span>
            <span className="text-sm text-white font-black tracking-tight">
              ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </header>

      <main className="w-full flex-1 py-12">
        <MinesPage playerPubkey={playerPubkey} balance={balance} setBalance={setBalance} />
      </main>
    </div>
  );
}

export default App;
