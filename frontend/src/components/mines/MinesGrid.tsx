import { motion } from 'framer-motion';
import { Diamond, Bomb } from 'lucide-react';
import { cn } from '../../lib/utils';

export type GameStatus = 'initial' | 'waiting' | 'active' | 'lost' | 'cashed';
export type CellAnswer = 'gem' | 'bomb' | null;

interface MinesGridProps {
	status: GameStatus;
	revealedIndices: number[];
	boardAnswer: CellAnswer[] | null;
	onReveal: (index: number) => void;
}

export function MinesGrid({ status, revealedIndices, boardAnswer, onReveal }: MinesGridProps) {
	const isInteractable = status === 'active';

	return (
		<div className="grid grid-cols-5 gap-3 w-full max-w-[500px] mx-auto">
			{Array.from({ length: 25 }).map((_, i) => {
				const isRevealed = revealedIndices.includes(i) || status === 'lost' || status === 'cashed';
				const answer = boardAnswer ? boardAnswer[i] : null;

				// Determine if it was revealed by user or just shown at end game
				const userRevealed = revealedIndices.includes(i);

				return (
					<motion.button
						key={i}
						disabled={!isInteractable || isRevealed}
						onClick={() => onReveal(i)}
						whileHover={(!isRevealed && isInteractable) ? { y: -4, backgroundColor: '#2c4757' } : {}}
						whileTap={!isRevealed && isInteractable ? { scale: 0.95 } : {}}
						className={cn(
							"relative flex aspect-square items-center justify-center rounded-lg transition-colors duration-300 shadow-md",
							// Default unrevealed state
							!isRevealed && "bg-[#213743] hover:bg-[#2c4757] border-b-4 border-[#1a2d37]",
							// Revealed Gem state
							isRevealed && (answer === 'gem' || userRevealed) && "bg-[#0f212e] border-2 border-[#1a2d37]",
							// Revealed Bomb state (Hit)
							isRevealed && answer === 'bomb' && userRevealed && "bg-danger border-2 border-red-800",
							// Revealed Bomb state (Not hit, just showing at end)
							isRevealed && answer === 'bomb' && !userRevealed && "bg-[#0f212e] border-2 border-[#1a2d37] opacity-60"
						)}
					>
						{isRevealed && (
							<motion.div
								initial={{ scale: 0, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								transition={{ type: 'spring', stiffness: 300, damping: 20 }}
							>
								{(answer === 'gem' || userRevealed && answer !== 'bomb') && (
									<Diamond className="w-8 h-8 md:w-12 md:h-12 text-primary fill-primary/20" />
								)}
								{answer === 'bomb' && (
									<Bomb className="w-8 h-8 md:w-12 md:h-12 text-white fill-white" />
								)}
							</motion.div>
						)}
					</motion.button>
				);
			})}
		</div>
	);
}
