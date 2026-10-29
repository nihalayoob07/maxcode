// POST /api/chat: Max Code's questions, lessons, debugging and screen reads, on the server's NVIDIA key. Only Max's two
// models are allowed, so the key can't be used as a general NVIDIA proxy. The reply is NVIDIA's, passed straight back.
import { guard, json } from '../lib/limits.js';

const MODELS = ['nvidia/nemotron-3.5-lightning-30b-a3b', 'nvidia/nemotron-3.5-super-vl-120b-a12b'];

// What a request counts against: a screen read (it carries a screenshot) or an ordinary question.
const kindOf = (messages) => (messages.some((m) => Array.isArray(m?.content) && m.content.some((p) => p?.type === 'image_url')) ? 'vision' : 'chat');

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!MODELS.includes(body?.model) || !Array.isArray(body.messages)) return json({ error: 'Not a Max Code request.' }, 400);
  const kind = kindOf(body.messages);
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
