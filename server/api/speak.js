// POST /api/speak { text }: Max's voice on the server's ElevenLabs key, as raw 24 kHz 16-bit PCM (what the app plays).
// Counted in characters: against the free daily allowance, or with a Max Plus licence (X-Max-Plus) its own fair use.
import { guard, json, spendPlus, upstash } from '../lib/limits.js';
import { checkPlus } from '../lib/plus.js';

// Max's own voice; a stock one if the account can't use it.
const VOICES = ['q1OMOTZNtqpS50TIQtu4', 'JBFqnCBsd6RMkjVDRZzb'];

export async function POST(request) {
  const text = String((await request.json().catch(() => null))?.text || '').trim().slice(0, 1200);
  if (!text) return json({ error: 'Nothing to say.' }, 400);
  const redis = upstash();
  const licence = redis && await checkPlus(redis, request.headers.get('x-max-plus'));
  const said = licence && await spendPlus(redis, { licence, amount: text.length });
  const stop = licence ? (said && json({ error: said }, 429)) : await guard(request, 'voice', text.length);
  if (stop) return stop;
  for (const voice of VOICES) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=pcm_24000`, {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_flash_v2_5' }),
    });
    if (res.ok) return new Response(res.body, { headers: { 'Content-Type': 'application/octet-stream' } });
    const err = await res.text().catch(() => '');
    if (res.status === 401 || !(res.status === 404 || /voice/i.test(err)) || voice === VOICES.at(-1)) {
      return json({ error: res.status === 429 || /quota|credits/i.test(err) ? 'Max has lost his voice for today.' : 'Max can\'t talk right now.' }, 502);
    }
  }
}
