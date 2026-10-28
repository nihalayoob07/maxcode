// Daily allowances for the free Max Code server, counted in Upstash Redis (its REST API, no SDK). Each install
// (a random id the app makes on first run) gets its own; each IP gets five installs' worth, so a script minting fresh
// ids still hits a wall; and a total per day for everyone keeps the NVIDIA and ElevenLabs bills from running away.
// Days are UTC. Users with their own keys never come here.

// Per install per day: questions, vision calls (a screen read is two), characters Max says (~5 minutes).
export const LIMITS = { chat: 60, vision: 20, voice: 4500 };
const PER_IP = 5;
const TOTAL = {
  chat: Number(process.env.CAP_CHAT || 3000),
  vision: Number(process.env.CAP_VISION || 400),
  voice: Number(process.env.CAP_VOICE || 40000),
};

const MESSAGES = {
  chat: "That's Max's free daily limit. It resets at midnight UTC, or add your own free NVIDIA key in Settings → Keys for unlimited use.",
  vision: "That's today's free screen reads. They reset at midnight UTC, or add your own free NVIDIA key in Settings → Keys.",
  voice: "Max has talked a lot today, so he'll type until midnight UTC. Add an ElevenLabs key in Settings → Keys to keep him talking.",
  total: 'Max is very busy today. Try again in a while, or add your own free NVIDIA key in Settings → Keys.',
};

const today = () => new Date().toISOString().slice(0, 10);

// redis(commands) -> results, one per command (Upstash's /pipeline).
export function upstash(url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN) {
  if (!url || !token) return null;
  return async (commands) => {
    const res = await fetch(`${url}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(commands) });
    if (!res.ok) throw new Error(`redis ${res.status}`);
    return (await res.json()).map((r) => r.result);
  };
}

// Counts `amount` of `kind` against all three allowances; returns the message to show if one is used up, else null.
export async function spend(redis, { install, ip, kind, amount, day = today() }) {
  const keys = [`u:${day}:${install}:${kind}`, `ip:${day}:${ip}:${kind}`, `all:${day}:${kind}`];
  const out = await redis(keys.flatMap((k) => [['INCRBY', k, amount], ['EXPIRE', k, 172800]]));
  const [mine, fromIp, everyone] = [out[0], out[2], out[4]].map(Number);
  if (everyone > TOTAL[kind]) return MESSAGES.total;
  if (mine > LIMITS[kind] || fromIp > LIMITS[kind] * PER_IP) return MESSAGES[kind];
  return null;
}

const json = (body, status) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// For the API routes: null to go ahead, or the Response that says why not.
export async function guard(request, kind, amount) {
  const install = request.headers.get('x-max-install') || '';
  if (!/^[\w-]{16,64}$/.test(install)) return json({ error: 'Update Max Code to use the free server.' }, 400);
  const redis = upstash();
  if (!redis) return json({ error: "Max's server isn't set up yet." }, 503);
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const stop = await spend(redis, { install, ip, kind, amount });
  return stop ? json({ error: stop }, 429) : null;
}
export { json };

// node lib/limits.js: checks the counting with a fake Redis.
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/').replace(/^\//, '')}`) {
  const assert = (await import('node:assert')).strict;
  const store = new Map();
  const fake = async (cmds) => cmds.map(([op, k, n]) => (op === 'INCRBY' ? (store.set(k, (store.get(k) || 0) + n), store.get(k)) : 1));
  const go = (install, ip, kind, amount = 1) => spend(fake, { install, ip, kind, amount, day: 'd' });
  for (let i = 0; i < 60; i++) assert.equal(await go('a', '1.1.1.1', 'chat'), null);
  assert.match(await go('a', '1.1.1.1', 'chat'), /free daily limit/);           // the 61st question
  assert.equal(await go('b', '1.1.1.1', 'chat'), null);                         // another install, same IP: fine
  for (let i = 0; i < 4 * 60; i++) await go(`x${i % 4}`, '2.2.2.2', 'chat');   // 240 from one IP across installs
  assert.equal(await go('y', '2.2.2.2', 'chat'), null);                         // 241st: still under 5 × 60
  for (let i = 0; i < 60; i++) await go('z', '2.2.2.2', 'chat');
  assert.match(await go('w', '2.2.2.2', 'chat'), /free daily limit/);           // over 300 from that IP, even on a new id
  assert.equal(await go('v', '3.3.3.3', 'voice', 4500), null);
  assert.match(await go('v', '3.3.3.3', 'voice', 1), /talked a lot/);
  store.clear();
  assert.match(await go('t', '4.4.4.4', 'vision', TOTAL.vision + 1), /very busy/); // everyone's total
  console.log('limits ok');
}
