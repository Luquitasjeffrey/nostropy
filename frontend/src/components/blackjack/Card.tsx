
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface CardState {
    suit?: Suit;
    rank?: Rank;
    isHidden?: boolean;
}

interface CardProps extends CardState {
    className?: string;
}

const suitSymbols: Record<Suit, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
};

const suitColors: Record<Suit, string> = {
    hearts: 'text-red-500',
    diamonds: 'text-red-500',
    clubs: 'text-slate-800',
    spades: 'text-slate-800',
};

export function Card({ suit, rank, isHidden = false, className }: CardProps) {
    // We use a 3D flip effect using Tailwind
    return (
        <div
            className={cn(
                'group relative h-36 w-24 sm:h-48 sm:w-32 perspective-1000',
                className
            )}
        >
            <div
                className={cn(
                    'w-full h-full transition-transform duration-500 transform-style-3d relative shadow-xl rounded-xl border border-white/10 shrink-0',
                    isHidden ? 'rotate-y-180' : ''
                )}
            >
                {/* Front of card */}
                <div
                    className={cn(
                        'absolute inset-0 w-full h-full backface-hidden bg-white rounded-xl overflow-hidden flex flex-col justify-between p-2 sm:p-3',
                        suit ? suitColors[suit] : ''
                    )}
                >
                    {suit && rank && !isHidden && (
                        <>
                            {/* Top Left */}
                            <div className="flex flex-col items-center self-start leading-none gap-1 font-bold text-lg sm:text-2xl">
                                <span>{rank}</span>
                                <span className="text-sm sm:text-xl leading-none">{suitSymbols[suit]}</span>
                            </div>

                            {/* Center Large Symbol */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-6xl sm:text-8xl">{suitSymbols[suit]}</span>
                            </div>

                            {/* Bottom Right */}
                            <div className="flex flex-col items-center self-end leading-none gap-1 font-bold text-lg sm:text-2xl rotate-180">
                                <span>{rank}</span>
                                <span className="text-sm sm:text-xl leading-none">{suitSymbols[suit]}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Back of card */}
                <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-700 to-indigo-900 rotate-y-180 rounded-xl border-2 border-white/20 p-2 shadow-inner">
                    <div className="w-full h-full border-2 border-blue-400/30 rounded-lg flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-600 to-transparent opacity-80 decoration-pattern">
                        <div className="w-8 h-8 sm:w-12 sm:h-12 border-2 border-white/40 rotate-45 flex items-center justify-center">
                            <div className="w-4 h-4 sm:w-6 sm:h-6 bg-white/40 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
