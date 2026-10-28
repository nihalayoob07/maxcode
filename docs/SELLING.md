# Selling Max Plus (for Nihal)

Max Plus is a Lemon Squeezy subscription. Buyers get a **licence key** by email and paste it into Max; the Max Code
server checks it with Lemon Squeezy and gives them Max's voice without the free daily limit. No accounts, no sign-in.

## 1. Lemon Squeezy (about 20 minutes)

1. Sign up at **lemonsqueezy.com** and create a store called **Max Code**. Start in **Test mode** (top of the
   dashboard): no approval needed, fake cards work.
2. **Products → New product → "Max Plus"**:
   - Pricing: **Subscription**, monthly (for example $4 / ₹299), and a yearly variant if you like.
   - Turn on **Generate license keys**. Set the activation limit to 3 and keep **License length** as *unlimited*, so the
     key is tied to the subscription: it stops working when the subscription ends.
   - Save, and **Publish**.
3. Copy two things (neither is secret):
   - The **product ID**: in the product's page URL or its "…" menu → *Copy ID*.
   - The **checkout link**: product → **Share** → copy the link.

## 2. Tell the server (Vercel)

Open **vercel.com/nova-8fee/maxcode-server/settings/environment-variables** and add, for **Production**:

| Name | Value |
|---|---|
| `LS_PRODUCT_ID` | the product ID from step 3 (Plus stays off until this is set) |
| `PLUS_CHECKOUT_URL` | the checkout link from step 3 (the app's *get Max Plus* opens it) |
| `PLUS_VOICE` | optional: characters of voice per Plus licence per day (default 15000, about 15 minutes) |

Then redeploy: push any change to the repo, or **Deployments → … → Redeploy** on the latest one.

## 3. Test it, then go live

1. In Test mode, open Max → **Settings → Keys → get Max Plus**, pay with Lemon Squeezy's test card
   (`4242 4242 4242 4242`, any future date, any CVC).
2. Paste the licence key from the test email into **Max Plus licence → Save**. It should say *Max Plus is on*.
3. To go live: finish **identity verification and payouts** in Lemon Squeezy (check payouts to India are supported for
   you; if not, the same design works with Razorpay), switch the store to **Live mode**, and update `LS_PRODUCT_ID` and
   `PLUS_CHECKOUT_URL` to the live product's values.

## Money and limits to watch

- **ElevenLabs credits** pay for every Plus minute. The server's ElevenLabs key is limited to 20,000 credits a month
  (about 40 minutes of speech in total, shared with free users). Each Plus subscriber can use up to `PLUS_VOICE` a day,
  so before selling many, **upgrade your ElevenLabs plan and raise the key's credit limit**. Rough cost: ~$0.04 per
  minute of speech; a heavy Plus user is about $1–3 a month, light users far less.
- **Free text answers** use your free NVIDIA key, which NVIDIA allows for prototyping only. Before a big public launch,
  move `NVIDIA_API_KEY` to a paid provider (it's one setting on the server).
- Lemon Squeezy keeps about 5% + 50¢ per sale; it handles VAT/GST as merchant of record.
- Free daily caps for everyone combined are `CAP_CHAT` (3000), `CAP_VISION` (400) and `CAP_VOICE` (1300 characters);
  per install: 60 questions, 10 screen reads, ~1 minute of voice (`server/lib/limits.js`).
