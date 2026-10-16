import { evaluate, EngineError } from '@/lib/engine';

// POST { femaleId, goals, simulateFailure? }
// 200 → ranked recommendations, exclusions, odds and explanations
// 422 → female failed readiness · 503 → Gene Engine timeout (simulated)
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: { code: 'BAD_REQUEST', message: 'Invalid JSON body.' } }, { status: 400 });
  }
  await new Promise((r) => setTimeout(r, 1600));

  if (body.simulateFailure) {
    return Response.json({
      error: {
        code: 'GENE_ENGINE_TIMEOUT',
        runId: 'kb-run-0412',
        message: "Your female and goals are saved. Ranking needs offspring predictions from Cltch's Gene Engine, which didn't respond in time.",
      },
    }, { status: 503 });
  }

  try {
    return Response.json(evaluate(body.femaleId, body.goals, body.female));
  } catch (e) {
    if (e instanceof EngineError) {
      return Response.json({ error: { code: e.code, message: e.message, ...e.extra } }, { status: e.status });
    }
    throw e;
  }
}
