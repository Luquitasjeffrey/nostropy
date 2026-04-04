import { useState, useRef, useEffect } from 'react';
import { Bitcoin, X, Loader2, CheckCircle2 } from 'lucide-react';
import { API_URL } from '../config';
import { authRequest } from '../utils/api';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  btcPrice: number;
  onSuccess: () => void;
}

export function WithdrawModal({ isOpen, onClose, btcPrice, onSuccess }: WithdrawModalProps) {
  const [fiatAmount, setFiatAmount] = useState<string>('');
  const [invoice, setInvoice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Compute satoshis from fiat amount based on current BTC price
  const numFiat = parseFloat(fiatAmount);
  // 1 BTC = 100,000,000 sats
  const estimatedSats = !isNaN(numFiat) && numFiat > 0 && btcPrice > 0
    ? Math.floor((numFiat / btcPrice) * 100_000_000)
    : 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setFiatAmount('');
      setInvoice('');
      setError(null);
      setSuccessData(null);
    }
  }, [isOpen]);

  const handleWithdraw = async () => {
    setError(null);

    // Basic Invoice format validation
    if (!invoice.toLowerCase().startsWith('lnbc')) {
      setError('Please enter a valid Lightning Network invoice (starts with lnbc)');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authRequest(`${API_URL}/api/ln/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentRequest: invoice }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process withdrawal');
      }

      setSuccessData(data);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during withdrawal');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-[#06141d] border-2 border-[#1a2d37] rounded-xl shadow-2xl p-6"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <Bitcoin className="text-primary" size={28} />
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
            Withdraw <span className="text-primary">Sats</span>
          </h2>
        </div>

        {!successData ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                Amount (USD) - <span className="text-gray-600">Optional Guide</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={fiatAmount}
                  onChange={(e) => setFiatAmount(e.target.value)}
                  min="0"
                  className="w-full bg-[#0f212e] border-2 border-[#1a2d37] rounded-lg pl-8 pr-4 py-3 text-lg font-bold text-white outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="text-xs font-bold text-gray-400 tracking-wide text-right">
                Equivalent to: <span className="text-primary">{estimatedSats.toLocaleString()} Sats</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                Lightning Invoice
              </label>
              <textarea
                placeholder="lnbc..."
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
                rows={4}
                className="w-full bg-[#0f212e] border-2 border-[#1a2d37] rounded-lg px-4 py-3 text-sm font-mono text-gray-300 resize-none outline-none focus:border-primary transition-colors break-all"
              />
            </div>

            {error && (
              <div className="text-sm font-bold text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3 break-words">
                {error}
              </div>
            )}

            <button
              onClick={handleWithdraw}
              disabled={isLoading || !invoice}
              className="w-full flex items-center justify-center space-x-2 py-4 bg-primary text-white font-black rounded-lg hover:bg-primary/80 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Pay Invoice</span>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300 flex flex-col items-center py-4">
            <CheckCircle2 size={64} className="text-green-500 mb-2" />
            <div className="text-center">
              <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2">
                Withdrawal Successful
              </h3>
              <p className="text-sm font-bold text-gray-400">
                Your invoice has been paid off-chain using the Lightning Network.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 mt-4 bg-panel border-2 border-[#1a2d37] hover:border-gray-500 text-gray-300 font-black rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
