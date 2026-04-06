import { useState, useRef, useEffect } from 'react';
import { Bitcoin, Copy, Check, X, Loader2, Zap } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { API_URL } from '../config';
import { authRequest } from '../utils/api';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  btcPrice: number;
}

export function DepositModal({ isOpen, onClose, btcPrice }: DepositModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [fiatAmount, setFiatAmount] = useState<string>('');
  const [invoice, setInvoice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

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
      // Reset state when closed
      setAmount('');
      setFiatAmount('');
      setInvoice(null);
      setError(null);
      setCopied(false);
    }
  }, [isOpen]);

  const handleFiatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFiatAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && btcPrice > 0) {
      setAmount(Math.floor((num / btcPrice) * 100_000_000).toString());
    } else {
      setAmount('');
    }
  };

  const handleSatsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmount(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0 && btcPrice > 0) {
      setFiatAmount(((num / 100_000_000) * btcPrice).toFixed(2));
    } else if (val === '') {
      setFiatAmount('');
    }
  };

  const handleDeposit = async () => {
    setError(null);
    const amountNum = parseInt(amount, 10);

    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authRequest(`${API_URL}/api/ln/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: amountNum }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate invoice');
      }

      setInvoice(data.payment_request);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!invoice) return;
    try {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
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
          <div className="relative">
            <Bitcoin className="text-primary" size={28} />
            <Zap className="absolute -top-1 -right-1 text-yellow-400 fill-yellow-400" size={14} />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
            Deposit <span className="text-primary">Sats</span>
          </h2>
        </div>

        {!invoice ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={fiatAmount}
                  onChange={handleFiatChange}
                  min="0"
                  className="w-full bg-[#0f212e] border-2 border-[#1a2d37] rounded-lg pl-8 pr-4 py-3 text-lg font-bold text-white outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                Amount (Satoshis)
              </label>
              <input
                type="number"
                placeholder="e.g. 10000"
                value={amount}
                onChange={handleSatsChange}
                min="1"
                className="w-full bg-[#0f212e] border-2 border-[#1a2d37] rounded-lg px-4 py-3 text-lg font-bold text-white outline-none focus:border-primary transition-colors"
              />
            </div>

            {error && (
              <div className="text-sm font-bold text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              onClick={handleDeposit}
              disabled={isLoading || !amount}
              className="w-full flex items-center justify-center space-x-2 py-4 bg-primary text-white font-black rounded-lg hover:bg-primary/80 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Generating Invoice...</span>
                </>
              ) : (
                <span>Generate Invoice</span>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-3 rounded-xl">
                  <QRCodeSVG
                    value={invoice}
                    size={200}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <label className="text-xs uppercase font-bold text-green-500 tracking-wider flex items-center space-x-1">
                  <Zap size={14} className="text-yellow-400 fill-yellow-400" />
                  <span>Lightning Invoice Ready</span>
                </label>
              </div>
              <div className="relative">
                <textarea
                  readOnly
                  value={invoice}
                  rows={5}
                  className="w-full bg-[#0f212e] border-2 border-[#1a2d37] rounded-lg px-4 py-3 text-sm font-mono text-gray-300 focus:outline-none resize-none break-all"
                />
                <button
                  onClick={handleCopy}
                  className="absolute top-3 right-3 p-2 bg-panel rounded-md border border-[#1a2d37] text-gray-400 hover:text-white hover:border-primary transition-colors flex items-center shadow-lg"
                  title="Copy Invoice"
                >
                  {copied ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            </div>

            <div className="text-[10px] font-bold text-gray-400 mt-2 text-center uppercase tracking-wide">
              Waiting for payment confirmation. The balance will update automatically when confirmed.
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 bg-panel border-2 border-[#1a2d37] hover:border-gray-500 text-gray-300 font-black rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
