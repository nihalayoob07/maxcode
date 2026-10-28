# Max Code

Max's coding tutor and debugger as its own Windows app. No server, no setup: install it, paste a free NVIDIA API key once, and go.

Max hides under the bottom of your screen with just a raised hand peeking out for 2 minutes, then out of sight. Click the hand, or press **Ctrl+Alt+M** any time (change the shortcut in Settings), and he pops up as a small chibi (curly hair, glasses, laptop). Click him to open his panel, drag him anywhere, right-click for Settings or Quit. After 5 idle minutes he hides again.

He dresses for the time of day: pyjamas and a nightcap at night (with zzz after midnight), droopy eyes, yawns and coffee early in the morning, sneaky bites of a sandwich at lunch, a backwards cap at weekends, and a witch hat and pumpkin for Halloween, a Santa hat at Christmas and a party hat at New Year. He jumps and sparkles when a bug gets fixed or you get a practice answer right. The schedule is in `ui/costume.js` (`node ui/costume.js` checks it). He looks at his laptop while he's thinking.

- **Debug my code**: finds the code on your screen in any app (an editor, a browser, a slide, a PDF), points at it and asks "Is this the code?" (or lets you drag a box around it), then finds the bugs. If that code is open in VS Code, Cursor or Windsurf, he can apply the fixes you accept.
- **Debug a file / Explain code**: drop a file or paste a program.
- **Ask anything**: "how do pointers work in C" gives a lesson with an example you can step through.
- **Courses** (in his panel): the common languages up front, and 43 in all (Rust, Haskell, COBOL, Assembly…) through the search box. Progress is saved on the PC.
- **Talk to him**: say "Max" ("Max, teach me Rust"), press **Ctrl+Alt+Space**, or click the mic. Listening runs on your PC with a small speech model that downloads itself the first time; no key needed. He answers out loud with an ElevenLabs key (optional).
- **Your level**: Beginner, Intermediate or Expert in Settings. Beginners get plain words and the simplest examples; experts get terse, precise answers with edge cases.
- **Settings** (three small tabs): General (level, theme, call shortcut, keep on top, start with Windows), Voice ("Max" on/off, talk shortcut), Keys.
- **Looks**: light theme is Paper (warm white, black ink); dark theme is Frost (translucent slate glass). It follows Windows unless you pick one in Settings.

It needs internet. Out of the box, answers (NVIDIA Nemotron) and Max's voice (ElevenLabs) come through the free Max Code server in `server/`, with a daily allowance per install. Add your own free NVIDIA key (and optionally an ElevenLabs key) in Settings → Keys to go direct with no limits; keys are stored encrypted on the PC (Windows DPAPI).

## Install

Download `MaxCode-Setup.exe` from the [Releases](https://github.com/nihalayoob07/maxcode/releases) page and run it. It installs, adds a desktop shortcut and opens. Windows may warn about an unknown publisher (the app isn't code-signed yet): click **More info → Run anyway**.

## Get an NVIDIA key

1. Go to [build.nvidia.com/settings/api-keys](https://build.nvidia.com/settings/api-keys) and sign in (free).
2. **Generate API Key**, copy it (it starts with `nvapi-`).
3. Paste it into Max Code. To change it later: right-click Max → **Settings**.

## The server

`server/` is a small Vercel project (team nova, https://maxcode-server-weld.vercel.app): `api/chat.js` (Max's two NVIDIA models only), `api/speak.js` (ElevenLabs), and `lib/limits.js` (per install / per IP / total daily caps in Upstash Redis; `node lib/limits.js` checks them). It needs `NVIDIA_API_KEY`, `ELEVENLABS_API_KEY` and an Upstash Redis store connected in Vercel. Deploy with `vercel deploy --prod` from `server/`.

## Build it yourself

```bash
npm install
npm start          # run it
npm run dist       # Windows installer in dist/MaxCode-Setup.exe
```

Releases: push a tag like `v0.1.0` and the GitHub Action builds the installer and attaches it to a release.
