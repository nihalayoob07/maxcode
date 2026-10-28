// What Max wears right now (pet.js puts these on <body> as c-* classes, pet.css draws them). Local time:
//   21:00-07:00 pyjamas and a nightcap · 00:00-05:00 night owl (tired eyes, zzz) · 05:00-09:00 sleepy (droopy eyes,
//   yawns, coffee) · 12:00-14:00 lunch (sneaks bites of a sandwich) · weekends 09:00-21:00 a backwards cap ·
//   29-31 Oct witch hat and a pumpkin · 24-25 Dec Santa hat · 31 Dec evening and 1 Jan party hat ·
//   28 Oct (Max Code's birthday) party hat and a cake · Fridays 17:00-21:00 dancing to music · 13:37 a 1337 laptop.
// One hat at most: a holiday hat beats the nightcap and the cap.
'use strict';
function costumes(d) {
  const h = d.getHours() + d.getMinutes() / 60, m = d.getMonth() + 1, day = d.getDate(), weekend = [0, 6].includes(d.getDay());
  const out = [];
  const pyjamas = h >= 21 || h < 7;
  if (pyjamas) out.push('pyjamas');
  if (h < 5) out.push('owl');
  if (h >= 5 && h < 9) out.push('sleepy');
  if (h >= 12 && h < 14) out.push('lunch');
  if (d.getDay() === 5 && h >= 17 && h < 21) out.push('friday');
  if (d.getHours() === 13 && d.getMinutes() === 37) out.push('leet');
  if (m === 10 && day === 28) out.push('birthday');
  const holiday = m === 10 && day >= 29 ? 'halloween'
    : m === 12 && (day === 24 || day === 25) ? 'santa'
    : (m === 12 && day === 31 && h >= 18) || (m === 1 && day === 1) || (m === 10 && day === 28) ? 'party' : '';
  if (holiday) out.push(holiday);
  else if (pyjamas) out.push('nightcap');
  else if (weekend) out.push('cap');
  return out;
}

// node ui/costume.js: checks the schedule.
if (typeof module !== 'undefined' && require.main === module) {
  const assert = require('assert');
  const at = (s) => costumes(new Date(s));
  assert.deepStrictEqual(at('2026-10-27T23:30'), ['pyjamas', 'nightcap']);                 // Tuesday night
  assert.deepStrictEqual(at('2026-10-27T02:00'), ['pyjamas', 'owl', 'nightcap']);
  assert.deepStrictEqual(at('2026-10-27T06:30'), ['pyjamas', 'sleepy', 'nightcap']);
  assert.deepStrictEqual(at('2026-10-27T08:00'), ['sleepy']);
  assert.deepStrictEqual(at('2026-10-27T12:45'), ['lunch']);
  assert.deepStrictEqual(at('2026-10-27T16:00'), []);
  assert.deepStrictEqual(at('2026-10-31T13:00'), ['lunch', 'halloween']);                   // Saturday: holiday beats cap
  assert.deepStrictEqual(at('2026-11-01T10:00'), ['cap']);                                  // Sunday
  assert.deepStrictEqual(at('2026-12-24T22:00'), ['pyjamas', 'santa']);
  assert.deepStrictEqual(at('2026-12-31T20:00'), ['party']);
  assert.deepStrictEqual(at('2027-01-01T03:00'), ['pyjamas', 'owl', 'party']);
  assert.deepStrictEqual(at('2026-10-28T10:00'), ['birthday', 'party']);                    // Max Code's birthday
  assert.deepStrictEqual(at('2026-10-30T13:37'), ['lunch', 'leet', 'halloween']);
  assert.deepStrictEqual(at('2026-10-30T18:00'), ['friday', 'halloween']);                   // Friday evening
  assert.deepStrictEqual(at('2026-11-06T18:00'), ['friday']);
  console.log('costume schedule ok');
}
