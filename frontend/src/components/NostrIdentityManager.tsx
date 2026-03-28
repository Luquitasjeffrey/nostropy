import { useState, useRef, useEffect } from 'react';
import { KeyRound, Dices, Copy, LogOut, Check } from 'lucide-react';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import { API_URL } from '../config';
import { authRequest } from '../utils/api';
interface NostrIdentityManagerProps {
  playerPubkey: string;
  setPlayerPubkey: (pubkey: string) => void;
}

export function NostrIdentityManager({ playerPubkey, setPlayerPubkey }: NostrIdentityManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recoveryNsec, setRecoveryNsec] = useState('');
  const [showNsec, setShowNsec] = useState(false);
  const [copied, setCopied] = useState<'npub' | 'nsec' | null>(null);
  const [userAlias, setUserAlias] = useState<string | null>(null);
  const [inputAlias, setInputAlias] = useState('');
  const [isSavingAlias, setIsSavingAlias] = useState(false);
  const [aliasMessage, setAliasMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (playerPubkey) {
      fetch(`${API_URL}/api/user/getalias/${playerPubkey}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.alias) {
            setUserAlias(data.alias);
            setInputAlias(data.alias);
          } else {
            setUserAlias(null);
            setInputAlias('');
          }
        })
        .catch((err) => console.error('Error fetching alias', err));
    } else {
      setUserAlias(null);
      setInputAlias('');
    }
  }, [playerPubkey]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFastGenerate = () => {
    try {
      const sk = generateSecretKey();
      const pk = getPublicKey(sk);
      const nsec = nip19.nsecEncode(sk);
      const npub = nip19.npubEncode(pk);

      localStorage.setItem('nostr_nsec', nsec);
      localStorage.setItem('nostr_npub', npub);

      // Tell App.tsx we have a new pubkey. This clears jwt_token and triggers a re-fetch of balances which will fetch a new JWT.
      setPlayerPubkey(npub);
    } catch (err) {
      console.error('Error generating identity', err);
      alert('Error generating identity');
    }
  };

  const handleRecovery = () => {
    try {
      if (!recoveryNsec.startsWith('nsec')) {
        alert('Invalid nsec');
        return;
      }
      const decoded = nip19.decode(recoveryNsec);
      if (decoded.type !== 'nsec') {
        alert('Not a valid nsec');
        return;
      }

      const sk = decoded.data as Uint8Array;
      const pk = getPublicKey(sk);
      const npub = nip19.npubEncode(pk);

      localStorage.setItem('nostr_nsec', recoveryNsec);
      localStorage.setItem('nostr_npub', npub);

      setPlayerPubkey(npub);
      setRecoveryNsec('');
    } catch (err) {
      console.error('Error recovering identity', err);
      alert('Error recovering identity');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nostr_nsec');
    localStorage.removeItem('nostr_npub');
    setPlayerPubkey('');
    setUserAlias(null);
    setInputAlias('');
    setIsOpen(false);
  };

  const handleSaveAlias = async () => {
    setIsSavingAlias(true);
    try {
      const aliasPayload = inputAlias.trim() || null;
      const res = await authRequest(`${API_URL}/api/user/setalias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ alias: aliasPayload }),
      });
      if (res.ok) {
        setUserAlias(aliasPayload);
        setAliasMessage({ text: 'Alias saved successfully', type: 'success' });
        setTimeout(() => setAliasMessage(null), 3000);
      } else {
        const data = await res.json();
        setAliasMessage({ text: data.error || 'Failed to save alias', type: 'error' });
        setTimeout(() => setAliasMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setAliasMessage({ text: 'Error saving alias', type: 'error' });
      setTimeout(() => setAliasMessage(null), 3000);
    }
    setIsSavingAlias(false);
  };

  const handleCopy = async (text: string, type: 'npub' | 'nsec') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const npub = localStorage.getItem('nostr_npub');
  const nsec = localStorage.getItem('nostr_nsec');

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2.5 bg-panel border-2 border-[#1a2d37] hover:border-primary hover:text-primary rounded-lg text-gray-400 font-bold transition-colors shadow-inner"
      >
        <KeyRound size={16} />
        <span className="truncate max-w-[200px]">
          {playerPubkey && npub ? (userAlias ? `@${userAlias}` : npub.slice(0, 10) + '...') : 'Login'}
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute top-14 right-0 w-80 bg-background border-2 border-panel rounded-xl shadow-2xl p-6 z-50"
          ref={modalRef}
        >
          <div className="text-xl font-black text-white mb-4">Nostr Identity</div>

          {playerPubkey && npub && nsec ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                  Public Key (npub)
                </label>
                <div className="flex bg-[#0f212e] p-2 rounded-lg border border-[#1a2d37] items-center">
                  <span className="flex-1 text-sm text-gray-300 truncate mr-2">{npub}</span>
                  <button
                    onClick={() => handleCopy(npub, 'npub')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {copied === 'npub' ? (
                      <Check size={16} className="text-green-500" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                  Private Key (nsec)
                </label>
                <div className="flex bg-[#0f212e] p-2 rounded-lg border border-[#1a2d37] items-center">
                  <span className="flex-1 text-sm text-gray-300 truncate mr-2 font-mono">
                    {showNsec ? nsec : 'nsec' + '*'.repeat(20)}
                  </span>
                  <button
                    onClick={() => setShowNsec(!showNsec)}
                    className="text-[10px] text-primary mr-3 font-bold uppercase tracking-wider hover:text-white transition-colors"
                  >
                    {showNsec ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => handleCopy(nsec, 'nsec')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {copied === 'nsec' ? (
                      <Check size={16} className="text-green-500" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                  Alias (Optional)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Set an alias..."
                    value={inputAlias}
                    onChange={(e) => setInputAlias(e.target.value)}
                    className="flex-1 min-w-0 bg-[#0f212e] border-2 border-[#1a2d37] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={handleSaveAlias}
                    disabled={isSavingAlias}
                    className="px-4 bg-primary text-white font-black rounded-lg hover:bg-primary/80 transition-colors shadow-sm disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
                {aliasMessage && (
                  <div
                    className={`text-xs font-bold pt-1 transition-opacity animate-pulse ${aliasMessage.type === 'success' ? 'text-green-500' : 'text-red-500'
                      }`}
                  >
                    {aliasMessage.text}
                  </div>
                )}
              </div>

              <div className="text-[10px] font-black text-[#ed4141] mt-2 mb-4 leading-relaxed tracking-wide uppercase border border-[#ed4141]/30 bg-[#ed4141]/10 p-3 rounded-lg text-center">
                do not share nor lose your private keys, the access to your account depends on you
                holding securely your private keys
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-panel border-2 border-[#1a2d37] hover:border-[#ed4141] hover:text-[#ed4141] rounded-lg text-gray-400 font-bold transition-colors mt-6 shadow-sm"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                  Recovery
                </label>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    placeholder="Enter your nsec..."
                    value={recoveryNsec}
                    onChange={(e) => setRecoveryNsec(e.target.value)}
                    className="flex-1 min-w-0 bg-[#0f212e] border-2 border-[#1a2d37] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={handleRecovery}
                    className="px-4 bg-primary text-white font-black rounded-lg hover:bg-primary/80 transition-colors shadow-sm"
                  >
                    Load
                  </button>
                </div>
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t-2 border-[#1a2d37]"></div>
                <span className="flex-shrink-0 mx-4 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                  OR
                </span>
                <div className="flex-grow border-t-2 border-[#1a2d37]"></div>
              </div>

              <div className="space-y-2 cursor-pointer group" onClick={handleFastGenerate}>
                <label className="text-xs uppercase font-bold text-gray-500 tracking-wider group-hover:text-primary transition-colors">
                  Fast Generate Token
                </label>
                <button className="w-full flex items-center justify-center space-x-3 py-4 bg-[#0f212e] border-2 border-primary text-primary group-hover:bg-primary group-hover:text-white rounded-xl font-black transition-all shadow-lg shadow-primary/20">
                  <Dices size={24} />
                  <span className="text-sm">Generate New Identity</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
