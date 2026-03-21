import { type BaccaratBets } from './useBaccaratEngine';
import { Chip, type ChipDenomination } from '../blackjack/Chip';

interface BettingTableProps {
    bets: BaccaratBets;
    onBetZone: (zone: keyof BaccaratBets) => void;
    locked: boolean;
    winner: 'player' | 'banker' | 'tie' | null;
}

export function BettingTable({ bets, onBetZone, locked, winner }: BettingTableProps) {
    return (
        <div className="w-full max-w-4xl mx-auto mt-8 grid grid-cols-3 gap-4 px-4 pb-8">
            {/* Player Zone */}
            <BetZone
                label="PLAYER"
                payout="1:1"
                amount={bets.player}
                onClick={() => onBetZone('player')}
                isWinner={winner === 'player'}
                locked={locked}
                color="blue"
            />

            {/* Tie Zone */}
            <BetZone
                label="TIE"
                payout="8:1"
                amount={bets.tie}
                onClick={() => onBetZone('tie')}
                isWinner={winner === 'tie'}
                locked={locked}
                color="green"
            />

            {/* Banker Zone */}
            <BetZone
                label="BANKER"
                payout="0.95:1"
                amount={bets.banker}
                onClick={() => onBetZone('banker')}
                isWinner={winner === 'banker'}
                locked={locked}
                color="red"
            />
        </div>
    );
}

interface BetZoneProps {
    label: string;
    payout: string;
    amount: number;
    onClick: () => void;
    isWinner: boolean;
    locked: boolean;
    color: 'blue' | 'red' | 'green';
}

function BetZone({ label, payout, amount, onClick, isWinner, locked, color }: BetZoneProps) {
    const colorClasses = {
        blue: 'border-blue-500/30 hover:border-blue-400/60 bg-blue-900/10',
        red: 'border-red-500/30 hover:border-red-400/60 bg-red-900/10',
        green: 'border-emerald-500/30 hover:border-emerald-400/60 bg-emerald-900/10',
    };

    const winnerClasses = isWinner ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] bg-yellow-400/10 animate-pulse scale-105' : '';

    return (
        <button
            onClick={onClick}
            disabled={locked}
            className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 ${colorClasses[color]} ${winnerClasses} ${locked ? 'cursor-default' : 'hover:scale-[1.02] active:scale-95'}`}
        >
            <span className="text-white/40 text-[10px] font-black tracking-[0.2em] mb-1">{payout}</span>
            <span className={`text-2xl font-black tracking-widest ${isWinner ? 'text-yellow-400' : 'text-white/90'}`}>{label}</span>

            {amount > 0 && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 scale-75 drop-shadow-2xl">
                    <div className="relative">
                        <Chip amount={1 as ChipDenomination} />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="bg-black/80 text-white text-[10px] px-2 py-0.5 rounded-full font-bold border border-white/20">
                                ${amount}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </button>
    );
}
