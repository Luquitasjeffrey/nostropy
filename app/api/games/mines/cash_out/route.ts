import { connectToDatabase } from '@/utils/db';
import MinesGame from '@/models/games/mines';

export async function POST(req: Request) {
  const body = await req.json();
  const { playerPubkey, gameId } = body;

  if (!playerPubkey || !gameId) {
    return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
  }

  await connectToDatabase();

  const game = await MinesGame.findById(gameId);
  if (!game) return new Response(JSON.stringify({ error: 'Game not found' }), { status: 404 });
  if (game.player_pubkey !== playerPubkey) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  if (game.status !== 'ACTIVE') return new Response(JSON.stringify({ error: 'Game not active' }), { status: 400 });

  if (!game.board_state.revealed_indices || game.board_state.revealed_indices.length === 0) {
    return new Response(JSON.stringify({ error: 'You must reveal at least one cell before cashing out' }), { status: 400 });
  }

  const payout = game.wager_amount * game.current_multiplier;
  game.status = 'CASHED_OUT';
  game.completed_at = new Date();
  await game.save();

  return new Response(JSON.stringify({
    success: true,
    payout,
    board: game.board_state.cell_types,
    serverSeed: game.server_seed,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
