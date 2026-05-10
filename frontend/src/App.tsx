import { useState, useEffect, useRef } from 'react';
import MinesPage from './components/MinesPage';
import DicePage from './components/DicePage';
import BlackjackPage from './components/BlackjackPage';
import ForkPage from './components/ForkPage';
import BaccaratPage from './components/BaccaratPage';
import PlinkoPage from './components/PlinkoPage';
import { Pickaxe, Dices, Spade, GitFork, Layers, Droplets, Network, Bitcoin } from 'lucide-react';
import { NostrIdentityManager } from './components/NostrIdentityManager';
import { LiveChat } from './components/LiveChat';
import { DepositModal } from './components/DepositModal';
import { WithdrawModal } from './components/WithdrawModal';
import logoImg from './assets/logo.png';
import { authRequest } from './utils/api';

import { API_URL } from './config';

function App() {
  const [playerPubkey, setPlayerPubkey] = useState('');
  const [allBalances, setAllBalances] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({ BTC: 60000, USDT: 1 }); // Reasonable defaults
  const [currentGame, setCurrentGame] = useState<
    'MINES' | 'DICE' | 'BLACKJACK' | 'BACCARAT' | 'FORK' | 'PLINKO'
  >('BLACKJACK');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isBalanceDropdownOpen, setIsBalanceDropdownOpen] = useState(false);
  const [isTestMode, setIsTestMode] = useState(() => localStorage.getItem('nostr_test_mode') === 'true');
  const balanceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('nostr_test_mode', isTestMode.toString());
    // Auto-switch away from "under development" games if test mode is disabled
    if (!isTestMode && (currentGame === 'BACCARAT' || currentGame === 'PLINKO')) {
      setCurrentGame('BLACKJACK');
    }
  }, [isTestMode, currentGame]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (balanceDropdownRef.current && !balanceDropdownRef.current.contains(event.target as Node)) {
        setIsBalanceDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const btcBalanceObj = allBalances.find((b) => b.symbol === 'BTC');
  const btcDecimals = btcBalanceObj ? btcBalanceObj.decimal_places : 8;
  const btcBalanceAmount = btcBalanceObj ? btcBalanceObj.amount / Math.pow(10, btcDecimals) : 0;

  return (
    <div className="min-h-screen bg-[#06141d] flex flex-col items-center">
      {/* Global Header */}
      <header className="w-full max-w-6xl mx-auto px-4 py-4 flex items-center justify-between border-b-2 border-panel bg-background shadow-lg">
        <div className="flex items-center space-x-6">
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
          <div className="hidden sm:flex items-center space-x-4 border-l-2 border-[#1a2d37] pl-6">
            <a href="https://t.me/nostropy" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#0088cc] hover:scale-110 transition-all duration-200" title="Telegram Support">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.85 5.18-4.686c.223-.195-.054-.31-.353-.111l-6.4 4.024-2.76-.86c-.6-.187-.61-.6.125-.89l10.84-4.18c.5-.186.96.11.828.98z"/>
              </svg>
            </a>
            <a href="https://github.com/Luquitasjeffrey/nostropy" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white hover:scale-110 transition-all duration-200" title="GitHub Repository">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
            </a>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <NostrIdentityManager
            playerPubkey={playerPubkey}
            setPlayerPubkey={(pk) => {
              setPlayerPubkey(pk);
              localStorage.removeItem('jwt_token');
            }}
          />

          {/* Test Mode Toggle */}
          <div className="flex items-center space-x-2 bg-panel border-2 border-[#1a2d37] px-3 py-1.5 rounded-lg shadow-inner">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Test Mode</span>
            <button
              onClick={() => setIsTestMode(!isTestMode)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isTestMode ? 'bg-[#f7931a]' : 'bg-gray-600'
                }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isTestMode ? 'translate-x-5' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>

          {!isTestMode && (
            <button
              onClick={() => setIsDepositModalOpen(true)}
              disabled={!playerPubkey}
              className="flex items-center space-x-2 px-3 py-2 bg-[#0f212e] border-2 border-[#1a2d37] hover:border-[#f7931a] hover:text-[#f7931a] rounded-lg text-gray-400 font-black transition-colors shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
              title="Deposit Bitcoin"
            >
              <Bitcoin size={16} />
              <span className="hidden sm:inline text-xs uppercase tracking-wider">Deposit</span>
            </button>
          )}

          {isTestMode && (
            <button
              onClick={async () => {
                if (!playerPubkey) return;
                try {
                  const res = await authRequest(`${API_URL}/api/user/faucet`, { method: 'POST' });
                  if (res.ok) {
                    fetchBalance(playerPubkey);
                  } else {
                    console.error('Failed to request faucet, status:', res.status);
                  }
                } catch (err) {
                  console.error('Error hitting faucet endpoint:', err);
                }
              }}
              className="flex items-center space-x-2 px-3 py-2 bg-[#0f212e] border-2 border-[#1a2d37] hover:border-primary hover:text-white rounded-lg text-primary font-black transition-colors shadow-inner"
              title="Reload Test Balance"
            >
              <Droplets size={16} />
              <span className="hidden sm:inline text-xs uppercase tracking-wider">Faucet</span>
            </button>
          )}

          <div className="relative" ref={balanceDropdownRef}>
            <button
              onClick={() => setIsBalanceDropdownOpen(!isBalanceDropdownOpen)}
              className="flex flex-col items-end justify-center px-5 py-2 bg-panel rounded-lg border-2 border-[#1a2d37] hover:border-gray-500 transition-colors shadow-inner"
            >
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
            </button>

            {isBalanceDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-background border-2 border-panel rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="p-4 border-b-2 border-[#1a2d37] flex flex-col items-center bg-[#06141d]">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Available BTC</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-black text-white">{btcBalanceAmount.toFixed(8)}</span>
                    <span className="text-xs font-bold text-[#f7931a]">BTC</span>
                  </div>
                  <span className="text-sm font-bold text-gray-400 mt-1">
                    ≈ ${usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {!isTestMode && (
                  <button
                    onClick={() => {
                      setIsWithdrawModalOpen(true);
                      setIsBalanceDropdownOpen(false);
                    }}
                    className="w-full text-left px-6 py-4 text-sm font-bold text-white hover:bg-[#0f212e] transition-colors flex items-center justify-center space-x-2"
                  >
                    <Bitcoin size={18} className="text-[#f7931a]" />
                    <span>Withdraw BTC</span>
                  </button>
                )}
                {isTestMode && (
                  <div className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center bg-[#0a1824]">
                    No Withdrawals
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 w-full overflow-hidden">
        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col items-center overflow-y-auto transition-all duration-300 ${isChatOpen ? 'pr-[350px]' : 'pr-0'}`}
        >
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
            {isTestMode && (
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
            )}
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
            {isTestMode && (
              <button
                onClick={() => setCurrentGame('PLINKO')}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold transition-colors ${currentGame === 'PLINKO'
                  ? 'bg-[#0f212e] text-primary border-2 border-primary shadow-lg shadow-primary/20'
                  : 'bg-panel text-gray-400 border-2 border-[#1a2d37] hover:text-white hover:border-gray-500'
                  }`}
              >
                <Network size={20} />
                <span>Plinko</span>
              </button>
            )}
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
            {currentGame === 'BACCARAT' && isTestMode && (
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
            {currentGame === 'PLINKO' && isTestMode && (
              <PlinkoPage
                playerPubkey={playerPubkey}
                allBalances={allBalances}
                prices={prices}
                onGameEnd={() => fetchBalance(playerPubkey)}
              />
            )}
          </main>
        </div>

        {/* Live Chat Sidebar */}
        <LiveChat isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
      </div>

      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        btcPrice={prices.BTC || 60000}
      />

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        btcPrice={prices.BTC || 60000}
        onSuccess={() => fetchBalance(playerPubkey)}
      />
    </div>
  );
}

export default App;
