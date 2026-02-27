import { connectToDatabase } from '@/utils/db';
import MinesGame from '@/models/games/mines';

const MINES_HOUSE_EDGE = Number(process.env.MINES_HOUSE_EDGE) || 0.01; // 1% default

function getMultiplier(revealedCount: number, minesCount: number) {
  let multiplier = 1.0;
  for (let i = 0; i < revealedCount; i++) {
    multiplier *= (25 - i) / (25 - minesCount - i);
  }

  multiplier = multiplier * (1.0 - MINES_HOUSE_EDGE);
  return multiplier;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { playerPubkey, gameId, index } = body;

  if (!playerPubkey || !gameId || typeof index !== 'number') {
    return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
  }

  await connectToDatabase();

  const game = await MinesGame.findById(gameId);
  if (!game) return new Response(JSON.stringify({ error: 'Game not found' }), { status: 404 });
  if (game.player_pubkey !== playerPubkey) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  if (game.status !== 'ACTIVE') return new Response(JSON.stringify({ error: 'Game not active' }), { status: 400 });

  if (game.board_state.revealed_indices.includes(index)) {
    return new Response(JSON.stringify({ error: 'Cell already revealed' }), { status: 400 });
  }

  const cellType = game.board_state.cell_types[index];
  if (!cellType) {
    return new Response(JSON.stringify({ error: 'Invalid cell index' }), { status: 400 });
  }

  if (cellType === 'bomb') {
    game.status = 'LOST';
    await game.save();

    return new Response(JSON.stringify({ success: false, serverSeed: game.server_seed, board: game.board_state.cell_types }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Gem found
  game.board_state.revealed_indices.push(index);



  // Simple deterministic multiplier increase: multiply by 1.2 per gem
  const newMultiplier = getMultiplier(game.board_state.revealed_indices.length, game.mines_count);
  game.current_multiplier = newMultiplier;

  await game.save();

  return new Response(JSON.stringify({ success: true, newMultiplier }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
