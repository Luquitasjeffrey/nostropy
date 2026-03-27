import { cn } from './Card';

export type ChipDenomination = 0.1 | 1 | 5 | 10 | 50 | 100 | 500;

interface ChipProps {
  amount: ChipDenomination;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

const chipStyles: Record<ChipDenomination, { bg: string; border: string; text: string }> = {
  0.1: { bg: 'bg-zinc-300', border: 'border-zinc-500', text: 'text-zinc-800' },
  1: { bg: 'bg-white', border: 'border-blue-700', text: 'text-blue-900' },
  5: { bg: 'bg-red-600', border: 'border-red-900', text: 'text-white' },
  10: { bg: 'bg-blue-600', border: 'border-blue-900', text: 'text-white' },
  50: { bg: 'bg-green-600', border: 'border-green-900', text: 'text-white' },
  100: { bg: 'bg-slate-900', border: 'border-slate-700', text: 'text-white' },
  500: { bg: 'bg-purple-600', border: 'border-purple-900', text: 'text-white' },
};

export function Chip({ amount, onClick, className, disabled = false }: ChipProps) {
  const style = chipStyles[amount];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-black shadow-lg shadow-black/40 transition-all duration-200',
        'border-[6px] outline outline-2 outline-black/20',
        style.bg,
        style.border,
        style.text,
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:-translate-y-1 hover:shadow-xl hover:shadow-black/60 active:translate-y-0 active:scale-95 cursor-pointer',
        className
      )}
    >
      {/* Outer dotted/dashed pattern simulating chip edge marks */}
      <div className="absolute inset-0 rounded-full border-[3px] border-dashed border-white/40 pointer-events-none" />

      {/* Inner circle */}
      <div className="absolute inset-2 rounded-full border border-black/20 bg-black/10 flex items-center justify-center backdrop-blur-sm pointer-events-none">
        <span className={cn('text-sm sm:text-base tracking-tighter drop-shadow-md', style.text)}>
          {amount < 1 ? amount : amount}
        </span>
      </div>
    </button>
  );
}
