// GET /api/plus: where to buy Max Plus (PLUS_CHECKOUT_URL, your Lemon Squeezy checkout link), or null if not on sale.
// POST /api/plus { key }: is this a valid Max Plus licence key? (Settings checks it before saving.)
import { json, upstash } from '../lib/limits.js';
import { checkPlus } from '../lib/plus.js';

export function GET() {
  return json({ checkout: process.env.PLUS_CHECKOUT_URL || null }, 200);
}

export async function POST(request) {
  const redis = upstash();
  if (!redis) return json({ error: "Max's server isn't set up yet." }, 503);
  const key = (await request.json().catch(() => null))?.key;
  return json({ valid: !!(await checkPlus(redis, key)) }, 200);
}
