import { connectToDatabase } from '@/utils/db';
import MinesGame from '@/models/games/mines';
import { generateGameSeed, GameSeed } from '@/utils/game_seed';

export async function POST(req: Request) {
  const body = await req.json();
  const { playerPubkey, gameId, clientSeed } = body;

  if (!playerPubkey || !gameId || !clientSeed) {
    return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
  }

  await connectToDatabase();

  const game = await MinesGame.findById(gameId);
  if (!game) return new Response(JSON.stringify({ error: 'Game not found' }), { status: 404 });
  if (game.player_pubkey !== playerPubkey) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  if (game.status !== 'WAITING_CLIENT_SEED') {
    return new Response(JSON.stringify({ error: 'Game not in a state to accept client seed' }), { status: 400 });
  }

  // Generate deterministic game seed from client and server secret
  const serverSeedValue = game.server_seed?.seed || '';
  const finalSeed = generateGameSeed(clientSeed, serverSeedValue);
  const rng = new GameSeed(finalSeed);

  // Build board: shuffle indices and pick first mines_count as bombs
  const totalCells = game.board_state?.cell_types?.length || 25;
  const indices = Array.from({ length: totalCells }, (_, i) => i);
  const shuffled = rng.shuffle(indices);
  const bombs = new Set(shuffled.slice(0, game.mines_count));

  const cellTypes = Array(totalCells).fill('gem').map((_, idx) => (bombs.has(idx) ? 'bomb' : 'gem'));

  game.board_state = {
    cell_types: cellTypes,
    revealed_indices: [],
  };
  game.client_seed = clientSeed;
  game.current_multiplier = 1.0;
  game.status = 'ACTIVE';

  await game.save();

  return new Response(JSON.stringify({ success: true, gameId: game._id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
