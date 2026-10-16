import { answer, EngineError } from '@/lib/engine';

// POST { femaleId, goals, question, context: { selectedMaleId, compareIds } }
// → { reply, action?, results?, changes?, earlier?, title? }
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: { code: 'BAD_REQUEST', message: 'Invalid JSON body.' } }, { status: 400 });
  }
  if (!body.question || !body.question.trim()) {
    return Response.json({ error: { code: 'QUESTION_REQUIRED', message: 'Ask a question first.' } }, { status: 400 });
  }
  await new Promise((r) => setTimeout(r, 900));
  try {
    return Response.json(answer(body.femaleId, body.goals, body.question, body.context || {}, body.female));
  } catch (e) {
    if (e instanceof EngineError) {
      return Response.json({ error: { code: e.code, message: e.message } }, { status: e.status });
    }
    throw e;
  }
}
