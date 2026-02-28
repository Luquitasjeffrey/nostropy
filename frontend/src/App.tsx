import { useState, useEffect } from 'react';
import MinesPage from './components/MinesPage';
import { KeyRound } from 'lucide-react';
import { Input } from './components/ui/Input';
import logoImg from './assets/logo.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [playerPubkey, setPlayerPubkey] = useState('');
  const [balance, setBalance] = useState(0); // This will hold the crypto balance (e.g. 0.0005 BTC)
  const [currencySymbol, setCurrencySymbol] = useState('BTC');

  // Currency Selector (simple implementation to remove lint warning and provide functionality)
  const availableCurrencies = ['BTC', 'USDT'];
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
        // Find the balance for current symbol
        const curBal = data.balances.find((b: any) => b.symbol === currencySymbol);
        if (curBal) {
          // Convert from smallest unit (integer) to float
          const floatBal = curBal.amount / Math.pow(10, curBal.decimal_places);
          setBalance(floatBal);
        } else {
          setBalance(0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  };

  useEffect(() => {
    fetchBalance(playerPubkey);
  }, [playerPubkey, currencySymbol]);

  const usdBalance = balance * (prices[currencySymbol] || 0);

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

          <div className="flex flex-col items-end justify-center px-5 py-1.5 bg-panel rounded-lg border-2 border-[#1a2d37] shadow-inner relative group cursor-pointer">
            <div className="flex items-center space-x-2">
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  Balance
                </span>
                <span className="text-sm text-white font-black tracking-tight">
                  $
                  {usdBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="h-8 w-px bg-[#1a2d37] mx-1" />
              <select
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="bg-transparent text-xs font-bold text-primary focus:outline-none cursor-pointer appearance-none"
              >
                {availableCurrencies.map((c) => (
                  <option key={c} value={c} className="bg-panel text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full flex-1 py-12">
        <MinesPage
          playerPubkey={playerPubkey}
          currencySymbol={currencySymbol}
          price={prices[currencySymbol] || 0}
          onGameEnd={() => fetchBalance(playerPubkey)}
        />
      </main>
    </div>
  );
}

export default App;
