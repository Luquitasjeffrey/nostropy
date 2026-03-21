import { useEffect, useState } from 'react';
import { Card, type Suit, type Rank, type CardState } from '../blackjack/Card';

interface HandDisplayProps {
    playerHand: CardState[];
    bankerHand: CardState[];
    playerScore: number;
    bankerScore: number;
    winner: 'player' | 'banker' | 'tie' | null;
    isDealing: boolean;
}

export function HandDisplay({ playerHand, bankerHand, playerScore, bankerScore, winner, isDealing }: HandDisplayProps) {
    const [visibleCards, setVisibleCards] = useState<{ player: number, banker: number }>({ player: 0, banker: 0 });

    useEffect(() => {
        if (isDealing) {
            setVisibleCards({ player: 0, banker: 0 });

            // Sequential deal simulation: P1, B1, P2, B2, P3?, B3?
            const intervals = [500, 1000, 1500, 2000, 2500, 3000];
            const timers: number[] = []; // Changed type from any[] to number[]

            // Deal first 4
            timers.push(setTimeout(() => setVisibleCards({ player: 1, banker: 0 }), intervals[0]));
            timers.push(setTimeout(() => setVisibleCards({ player: 1, banker: 1 }), intervals[1]));
            timers.push(setTimeout(() => setVisibleCards({ player: 2, banker: 1 }), intervals[2]));
            timers.push(setTimeout(() => setVisibleCards({ player: 2, banker: 2 }), intervals[3]));

            if (playerHand.length > 2) {
                timers.push(setTimeout(() => setVisibleCards(prev => ({ ...prev, player: 3 })), intervals[4]));
            }
            if (bankerHand.length > 2) {
                timers.push(setTimeout(() => setVisibleCards(prev => ({ ...prev, banker: 3 })), intervals[5]));
            }

            return () => timers.forEach(clearTimeout);
        } else {
            setVisibleCards({ player: playerHand.length, banker: bankerHand.length });
        }
    }, [isDealing, playerHand.length, bankerHand.length]);

    const renderHand = (label: string, cards: CardState[], visibleCount: number, _score: number, isWinner: boolean) => {
        const scoreDuringDeal = cards.slice(0, visibleCount).reduce((acc, card) => {
            const val = ['10', 'J', 'Q', 'K'].includes(card.rank!) ? 0 : (card.rank === 'A' ? 1 : parseInt(card.rank!));
            return (acc + val) % 10;
        }, 0);

        return (
            <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-white/40 text-[10px] font-black tracking-widest uppercase">{label}</span>
                    {visibleCount >= 2 && (
                        <span className={`px-3 py-1 rounded-full text-xs font-black transition-all ${isWinner ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'bg-black/40 text-white'}`}>
                            {scoreDuringDeal}
                        </span>
                    )}
                </div>

                <div className="flex justify-center -space-x-12 sm:-space-x-16 h-36 sm:h-48 min-w-[120px]">
                    {cards.slice(0, visibleCount).map((card, i) => (
                        <Card
                            key={i}
                            suit={card.suit as Suit}
                            rank={card.rank as Rank}
                            className={`shadow-2xl transition-all duration-500 hover:-translate-y-2 ${i === 2 ? 'rotate-12 translate-x-4' : ''}`}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="w-full flex justify-center items-end gap-12 sm:gap-24 py-8 relative">
            {renderHand('Banker', bankerHand, visibleCards.banker, bankerScore, winner === 'banker')}
            {renderHand('Player', playerHand, visibleCards.player, playerScore, winner === 'player')}

            {winner === 'tie' && !isDealing && visibleCards.player >= 2 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                    <span className="bg-emerald-500 text-black px-6 py-2 rounded-full font-black text-xl tracking-tighter shadow-2xl border-2 border-emerald-400 animate-bounce">
                        TIE GAME
                    </span>
                </div>
            )}
        </div>
    );
}
