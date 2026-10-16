import { listFemales, publicSnake } from '@/lib/engine';
import { MALES } from '@/lib/mock-data';

export async function GET() {
  await new Promise((r) => setTimeout(r, 150));
  return Response.json({
    females: listFemales(),
    males: MALES.map(publicSnake),
    syncedAt: '12 min ago',
    source: 'Cltch (sample data)',
  });
}
