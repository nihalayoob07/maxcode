# Max Code: plans and keys

Max Code is **free**. Install it and Max answers right away, no account and no keys. Two things have daily limits on the
free plan, and each has its own way to lift them.

## At a glance

| | Free (nothing to do) | Your own key (free) | Max Plus (subscription) |
|---|---|---|---|
| **Answers, lessons, debugging** | 60 questions a day | Unlimited, with your own NVIDIA key | Same as free |
| **Reading code off your screen** | 10 a day | Unlimited, with your own NVIDIA key | Same as free |
| **Max talking out loud** | About 1 minute a day | Unlimited, with your own ElevenLabs key | About 15 minutes a day, no key needed |
| **Max listening to you** | Unlimited (runs on your PC) | Unlimited | Unlimited |

Limits reset every day at midnight UTC (5:30 am in India). When one runs out, Max tells you and keeps going where he
can: when his voice runs out he types instead.

## Answers: add your own free NVIDIA key (no limits)

Max's answers come from NVIDIA's AI. Out of the box they go through the free Max Code server, which shares one key
among everyone, hence the daily limit. Your own key is free and has no Max Code limits.

1. Go to **build.nvidia.com/settings/api-keys** and sign in (free).
2. Click **Generate API Key** and copy it. It starts with `nvapi-`.
3. In Max: right-click him (or the tray icon) → **Settings** → **Keys** → paste it next to **NVIDIA API key** → **Save**.
   Max checks it with NVIDIA first. It then says *Saved: no daily limit*.

## Max's voice: three choices

**1. Free** – nothing to do. Max talks for about a minute a day, then types.

**2. Your own ElevenLabs account** – if you already pay for ElevenLabs, or want to use its free plan yourself:

1. Go to **elevenlabs.io** → **Developers** → **API Keys** → **Create API Key**.
2. Turn on **Text to Speech** (and **Speech to Text** if you want ElevenLabs to listen too; otherwise Max listens on your
   PC for free). Leave everything else off.
3. Copy the key (it starts with `sk_`) and paste it in Max's **Settings → Keys → ElevenLabs key** → **Save**.

Max then uses your account's credits, with no Max Code limit.

**3. Max Plus** – Max's voice without the daily minute, no ElevenLabs account needed:

1. In Max: **Settings → Keys → get Max Plus**. That opens the checkout.
2. After paying, you get an email with a **licence key**.
3. Paste it in **Settings → Keys → Max Plus licence** → **Save**. It says *Max Plus is on*.

Cancel any time from the link in that email; the voice goes back to free when the paid month ends. Plus has a fair-use
allowance of about 15 minutes of talking a day. If you also add your own ElevenLabs key, Max uses that instead.

## Your keys are safe

Keys you add are saved encrypted on your PC with Windows' own protection (tied to your Windows account) and are only
ever sent to the service they belong to: NVIDIA, ElevenLabs, or the Max Plus check. They're never in the app's code or
on GitHub. What you say to Max is heard on your PC; it only leaves it if you added an ElevenLabs key for listening.
