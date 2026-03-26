import { useState, useEffect } from 'react';
import MinesPage from './components/MinesPage';
import DicePage from './components/DicePage';
import BlackjackPage from './components/BlackjackPage';
import ForkPage from './components/ForkPage';
import BaccaratPage from './components/BaccaratPage';
import { Pickaxe, Dices, Spade, GitFork, Layers } from 'lucide-react';
import { NostrIdentityManager } from './components/NostrIdentityManager';
import logoImg from './assets/logo.png';
import { authRequest } from './utils/api';

import { API_URL } from './config';

function App() {
  const [playerPubkey, setPlayerPubkey] = useState('');
  const [allBalances, setAllBalances] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({ BTC: 60000, USDT: 1 }); // Reasonable defaults
  const [currentGame, setCurrentGame] = useState<'MINES' | 'DICE' | 'BLACKJACK' | 'BACCARAT' | 'FORK'>('FORK');

  useEffect(() => {
    // Check if nostr identity is persisted
    const storedNpub = localStorage.getItem('nostr_npub');
    if (storedNpub) {
      setPlayerPubkey(storedNpub);
      // Ensure we clear legacy basic storedPub if present
      localStorage.removeItem('playerPubkey');
    } else {
      // Legacy fallback
      const storedPub = localStorage.getItem('playerPubkey');
      if (storedPub) setPlayerPubkey(storedPub);
    }

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
      const response = await authRequest(`${API_URL}/api/user/balance?pubkey=${pubkey}`);
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
          <NostrIdentityManager
            playerPubkey={playerPubkey}
            setPlayerPubkey={(pk) => {
              setPlayerPubkey(pk);
              localStorage.removeItem('jwt_token');
            }}
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

      {/* Game Tabs */}
      <div className="w-full max-w-6xl mx-auto px-4 mt-8 flex space-x-4">
        <button
          onClick={() => setCurrentGame('DICE')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold transition-colors ${currentGame === 'DICE'
            ? 'bg-[#0f212e] text-primary border-2 border-primary shadow-lg shadow-primary/20'
            : 'bg-panel text-gray-400 border-2 border-[#1a2d37] hover:text-white hover:border-gray-500'
            }`}
        >
          <Dices size={20} />
          <span>Satoshi Dice</span>
        </button>
        <button
          onClick={() => setCurrentGame('MINES')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold transition-colors ${currentGame === 'MINES'
            ? 'bg-[#0f212e] text-primary border-2 border-primary shadow-lg shadow-primary/20'
            : 'bg-panel text-gray-400 border-2 border-[#1a2d37] hover:text-white hover:border-gray-500'
            }`}
        >
          <Pickaxe size={20} />
          <span>Mines</span>
        </button>
        <button
          onClick={() => setCurrentGame('BLACKJACK')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold transition-colors ${currentGame === 'BLACKJACK'
            ? 'bg-[#0f212e] text-primary border-2 border-primary shadow-lg shadow-primary/20'
            : 'bg-panel text-gray-400 border-2 border-[#1a2d37] hover:text-white hover:border-gray-500'
            }`}
        >
          <Spade size={20} />
          <span>Blackjack</span>
        </button>
        <button
          onClick={() => setCurrentGame('BACCARAT')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold transition-colors ${currentGame === 'BACCARAT'
            ? 'bg-[#0f212e] text-primary border-2 border-primary shadow-lg shadow-primary/20'
            : 'bg-panel text-gray-400 border-2 border-[#1a2d37] hover:text-white hover:border-gray-500'
            }`}
        >
          <Layers size={20} />
          <span>Baccarat</span>
        </button>
        <button
          onClick={() => setCurrentGame('FORK')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold transition-colors ${currentGame === 'FORK'
            ? 'bg-[#0f212e] text-primary border-2 border-primary shadow-lg shadow-primary/20'
            : 'bg-panel text-gray-400 border-2 border-[#1a2d37] hover:text-white hover:border-gray-500'
            }`}
        >
          <GitFork size={20} />
          <span>Fork</span>
        </button>
      </div>

      <main className="w-full flex-1 py-12">
        {currentGame === 'MINES' && (
          <MinesPage
            playerPubkey={playerPubkey}
            allBalances={allBalances}
            prices={prices}
            onGameEnd={() => fetchBalance(playerPubkey)}
          />
        )}
        {currentGame === 'DICE' && (
          <DicePage
            playerPubkey={playerPubkey}
            allBalances={allBalances}
            prices={prices}
            onGameEnd={() => fetchBalance(playerPubkey)}
          />
        )}
        {currentGame === 'BLACKJACK' && (
          <BlackjackPage
            playerPubkey={playerPubkey}
            allBalances={allBalances}
            prices={prices}
            onGameEnd={() => fetchBalance(playerPubkey)}
          />
        )}
        {currentGame === 'BACCARAT' && (
          <BaccaratPage
            playerPubkey={playerPubkey}
            allBalances={allBalances}
            prices={prices}
            onGameEnd={() => fetchBalance(playerPubkey)}
          />
        )}
        {currentGame === 'FORK' && (
          <ForkPage
            playerPubkey={playerPubkey}
            allBalances={allBalances}
            prices={prices}
            onGameEnd={() => fetchBalance(playerPubkey)}
          />
        )}
      </main>
    </div>
  );
}

export default App;
