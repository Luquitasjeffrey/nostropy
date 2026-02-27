import { connectToDatabase } from '@/utils/db';
import MinesGame from '@/models/games/mines';
import { generateServerSeed } from '@/utils/game_seed';

export async function POST(req: Request) {
  const body = await req.json();
  const { wagerAmount, playerPubkey } = body;

  if (!wagerAmount || !playerPubkey) {
    return new Response(JSON.stringify({ error: 'Missing wagerAmount or playerPubkey' }), { status: 400 });
  }

  await connectToDatabase();

  const serverSeed = generateServerSeed();

  const game = new MinesGame({
    player_pubkey: playerPubkey,
    wager_amount: wagerAmount,
    potentialPayout: wagerAmount,
    board_state: {
      cell_types: Array(25).fill('gem'),
      revealed_indices: [],
    },
    status: 'WAITING_CLIENT_SEED',
    server_seed: serverSeed, // keep secret until reveal
    // store serverSeedHash if you want; generateServerSeed returned hash too
  });

  await game.save();

  return new Response(JSON.stringify({ gameId: game._id, serverSeedHash: serverSeed.hash }), { status: 201, headers: { 'Content-Type': 'application/json' } });
}
