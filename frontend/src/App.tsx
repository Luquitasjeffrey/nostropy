import { useState, useEffect } from 'react';
import MinesPage from './components/MinesPage';
import { KeyRound } from 'lucide-react';
import { Input } from './components/ui/Input';
import logoImg from './assets/logo.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [playerPubkey, setPlayerPubkey] = useState('');
  const [allBalances, setAllBalances] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({ BTC: 60000, USDT: 1 }); // Reasonable defaults

  useEffect(() => {
    const storedPub = localStorage.getItem('playerPubkey');
    if (storedPub) setPlayerPubkey(storedPub);

    // Initial price fetch
    fetchPrices();
    // Refresh prices every minute
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchPrices = async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether&vs_currencies=usd'
      );
      const data = await response.json();
      if (data.bitcoin && data.tether) {
        setPrices({
          BTC: data.bitcoin.usd,
          USDT: data.tether.usd,
        });
      }
    } catch (err) {
      console.error('Failed to fetch prices:', err);
    }
  };

  const fetchBalance = async (pubkey: string) => {
    if (!pubkey) return;
    try {
      const response = await fetch(`${API_URL}/api/user/balance?pubkey=${pubkey}`);
      const data = await response.json();
      if (data.balances) {
        setAllBalances(data.balances);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  };

  useEffect(() => {
    fetchBalance(playerPubkey);
  }, [playerPubkey]);

  const usdBalance = allBalances.reduce((total, bal) => {
    const price = prices[bal.symbol] || 0;
    const amountFloat = bal.amount / Math.pow(10, bal.decimal_places);
    return total + amountFloat * price;
  }, 0);

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

          <div className="flex flex-col items-end justify-center px-5 py-2 bg-panel rounded-lg border-2 border-[#1a2d37] shadow-inner">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
              Total Balance
            </span>
            <span className="text-sm text-white font-black tracking-tight">
              $
              {usdBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </header>

      <main className="w-full flex-1 py-12">
        <MinesPage
          playerPubkey={playerPubkey}
          allBalances={allBalances}
          prices={prices}
          onGameEnd={() => fetchBalance(playerPubkey)}
        />
      </main>
    </div>
  );
}

export default App;
