// Max Plus: a Lemon Squeezy licence key (sent with each voice request) unlocks Max's voice without the free daily limit.
// Checked with Lemon Squeezy's licence API (it needs no secret) and remembered for an hour in Redis. Only keys for the
// Max Plus product count (LS_PRODUCT_ID); without that setting, Plus is off. A subscription that ends makes its key
// invalid, so the next check after the hour drops it back to the free voice.
import { createHash } from 'node:crypto';

// The licence's short id (for counting and caching) if it's a valid Max Plus key, else null.
export async function checkPlus(redis, key) {
  key = String(key || '').trim();
  if (!process.env.LS_PRODUCT_ID || !/^[\w-]{10,100}$/.test(key)) return null;
  const id = createHash('sha256').update(key).digest('hex').slice(0, 32);
  const [cached] = await redis([['GET', `lic:${id}`]]);
  if (cached === '1' || cached === '0') return cached === '1' ? id : null;
  const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ license_key: key }),
  }).catch(() => null);
  if (!res) return null;   // Lemon Squeezy unreachable: free voice this time, try again next request
  const j = await res.json().catch(() => ({}));
  const ok = j.valid === true && String(j.meta?.product_id) === String(process.env.LS_PRODUCT_ID);
  await redis([['SET', `lic:${id}`, ok ? '1' : '0', 'EX', 3600]]);
  return ok ? id : null;
}
