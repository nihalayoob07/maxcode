// POST /api/chat: Max Code's questions, lessons, debugging and screen reads, on the server's NVIDIA key. Only Max's two
// models are allowed, so the key can't be used as a general NVIDIA proxy. The reply is NVIDIA's, passed straight back.
import { guard, json } from '../lib/limits.js';

const MODELS = { 'nvidia/nemotron-3.5-lightning-30b-a3b': 'chat', 'nvidia/nemotron-3.5-super-vl-120b-a12b': 'vision' };

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const kind = MODELS[body?.model];
  if (!kind || !Array.isArray(body.messages)) return json({ error: 'Not a Max Code request.' }, 400);
  const stop = await guard(request, kind, 1);
  if (stop) return stop;
  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: body.model, messages: body.messages, temperature: body.temperature,
      max_tokens: Math.min(Number(body.max_tokens) || 4000, 16000), chat_template_kwargs: body.chat_template_kwargs,
    }),
  });
  return new Response(res.body, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
}
