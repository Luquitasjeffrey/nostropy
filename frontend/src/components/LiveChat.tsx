import { useState, useEffect, useRef } from 'react';
import { Send, Trophy, Skull, MessageSquare, X } from 'lucide-react';

interface BetResult {
  payout: number;
  fiatCode: string;
  bitcoinAmount: number;
  game: string;
}

interface ChatMessage {
  id: string;
  type: 'message' | 'bet';
  from: string;
  content: string | BetResult;
  timestamp: number;
}

const DUMMY_MESSAGES: ChatMessage[] = [
  { id: '1', type: 'message', from: '@AliasUsuario', content: 'Hey, this casino is very cool', timestamp: Date.now() - 1000 * 60 * 5 },
  { id: '2', type: 'bet', from: 'npub5234x...', content: { payout: 300, fiatCode: 'USD', bitcoinAmount: 0.0013, game: 'blackjack' }, timestamp: Date.now() - 1000 * 60 * 4 },
  { id: '3', type: 'message', from: '@AliasUsuario2', content: 'I just won 5k!!!', timestamp: Date.now() - 1000 * 60 * 3 },
  { id: '4', type: 'bet', from: '@AliasUsuario3', content: { payout: -300, fiatCode: 'USD', bitcoinAmount: 0.0013, game: 'blackjack' }, timestamp: Date.now() - 1000 * 60 * 2 },
];

interface LiveChatProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function LiveChat({ isOpen, setIsOpen }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(DUMMY_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'message',
      from: '@You',
      content: inputValue,
      timestamp: Date.now(),
    };

    setMessages([...messages, newMessage]);
    setInputValue('');
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-24 right-6 z-50 p-3 rounded-full bg-primary text-black shadow-lg hover:bg-primaryHover transition-all duration-300 pointer-events-auto ${isOpen ? 'translate-x-[50px] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
          }`}
      >
        <MessageSquare size={24} />
      </button>

      <div
        className={`flex flex-col h-full w-[350px] fixed right-0 top-0 pt-20 pb-6 z-40 transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Background with gradient: transparent on the left, solid black on the right */}
        <div
          className="absolute inset-x-0 inset-y-0 -z-10"
          style={{
            background: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.95) 100%)'
          }}
        />

        <div className="flex-1 flex flex-col overflow-hidden px-6">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
            <h2 className="text-white font-black text-xl tracking-tighter uppercase italic">
              Live <span className="text-primary">Chat</span>
            </h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Live
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Close Chat"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          >
            {messages.map((msg) => (
              <div key={msg.id} className="animate-in fade-in slide-in-from-right-4 duration-300">
                {msg.type === 'message' ? (
                  <div className="text-sm">
                    <span className="text-gray-400 font-bold mr-2">{msg.from}:</span>
                    <span className="text-white">{msg.content as string}</span>
                  </div>
                ) : (
                  <div className={`text-sm flex items-center space-x-2 font-bold ${(msg.content as BetResult).payout > 0 ? 'text-primary' : 'text-danger'}`}>
                    {(msg.content as BetResult).payout > 0 ? <Trophy size={14} /> : <Skull size={14} />}
                    <span>
                      {msg.from} {(msg.content as BetResult).payout > 0 ? 'Won' : 'Lost'} ${Math.abs((msg.content as BetResult).payout)} {(msg.content as BetResult).fiatCode} (₿ {(msg.content as BetResult).bitcoinAmount}) on {(msg.content as BetResult).game}
                    </span>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="mt-4 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-primary/50 transition-all font-medium pr-12 shadow-2xl"
            />
            <button
              type="submit"
              className="absolute right-2 top-1.5 p-1.5 bg-primary text-black rounded-lg hover:bg-primaryHover transition-colors shadow-lg"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}