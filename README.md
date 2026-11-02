# Max Code

Max's coding tutor and debugger as its own Windows app. No server, no setup: install it, paste a free NVIDIA API key once, and go.

Max hides under the bottom of your screen with just a raised hand peeking out for 2 minutes, then out of sight. Click the hand, or press **Ctrl+Alt+M** any time (change the shortcut in Settings), and he pops up as a small chibi (curly hair, glasses, laptop). Click him to open his panel, slide him along the taskbar, right-click for Settings or Quit. After a minute idle he hides again.

He dresses for the time of day: pyjamas and a nightcap at night (with zzz after midnight), droopy eyes, yawns and coffee early in the morning, sneaky bites of a sandwich at lunch, a backwards cap at weekends, and a witch hat and pumpkin for Halloween, a Santa hat at Christmas and a party hat at New Year. He jumps and sparkles when a bug gets fixed or you get a practice answer right. The schedule is in `ui/costume.js` (`node ui/costume.js` checks it). He looks at his laptop while he's thinking.

- **Debug my code**: finds the code on your screen in any app (an editor, a browser, a slide, a PDF), points at it and asks "Is this the code?" (or lets you drag a box around it), then shows each bug right there: a note beside the line with an arrow at it, and **Apply fix** types the fix into your editor (Ctrl+Z undoes it). Works in any app you can type in.
  The note follows the code if you scroll or move the window. **Fix all** fixes every bug at once (one Ctrl+Z undoes it).
- **Just fix it** (Settings → When I debug): no walking through bugs; Max fixes everything and the **Bug log** (home screen) keeps each fix, with the line before and after.
- **Debug a file / Explain code**: drop a file or paste a program.
- **Your level** (Settings): Beginner, Intermediate or Expert; every explanation is pitched for it.
- Tests: `npm test` (Max's own code checks, no AI), `npm run bench` (39 programs in 6 languages scored against the AI, 26 of them held out from tuning, 17 correct ones to catch false alarms; see `test/bench/bench.mjs`).
- **Ask anything**: "how do pointers work in C" gives a lesson with an example you can step through.
- **Courses** (in his panel): the common languages up front, and 43 in all (Rust, Haskell, COBOL, Assembly…) through the search box. Progress is saved on the PC.
- **Talk to him**: say "Max" ("Max, teach me Rust"), press **Ctrl+Alt+T**, or click the mic. Listening runs on your PC with a small speech model that downloads itself the first time; no key needed. He answers out loud: about a minute a day free, more with your own ElevenLabs key or Max Plus.
- **Your level**: Beginner, Intermediate or Expert in Settings. Beginners get plain words and the simplest examples; experts get terse, precise answers with edge cases.
- **Settings** (three small tabs): General (level, theme, call shortcut, keep on top, start with Windows), Voice ("Max" on/off, talk shortcut), Keys.
- **Looks**: light theme is Paper (warm white, black ink); dark theme is Frost (translucent slate glass). It follows Windows unless you pick one in Settings.

**Free, with daily limits.** See [docs/GUIDE.md](docs/GUIDE.md) for the plans and keys (and [docs/SELLING.md](docs/SELLING.md) for setting up Max Plus). It needs internet. Out of the box, answers (NVIDIA Nemotron) and Max's voice (ElevenLabs) come through the free Max Code server in `server/`, with a daily allowance per install. Add your own free NVIDIA key (and optionally an ElevenLabs key) in Settings → Keys to go direct with no limits; keys are stored encrypted on the PC (Windows DPAPI).

## Privacy and safety

- **What leaves your PC, and only when you ask:** the code you debug, explain or ask about, and for **Debug my code** a picture of the screen it's on. It goes to NVIDIA (through the Max Code server unless you added your own key). Nothing is sent in the background, and the screen is never captured unless you press Debug my code or Apply fix.
- **Stays on your PC:** your voice (heard by Whisper on the PC), your keys (encrypted with Windows DPAPI), the bug log, course progress and settings. Pictures of the screen are deleted as soon as they're read.
- **Your code is never run.** Max only compiles it to check it (TinyCC for C, plus g++, javac, Python and Node when the PC has them).
- **Code is data, not instructions.** Text inside code (a comment saying "ignore your rules") can't steer Max into adding anything to your files: Fix all refuses a rewrite that changes more than the bugs need, or adds things like running commands, network calls or deleting files that weren't already there.
- **The app is locked down:** every window is sandboxed, can't navigate to the web or open other pages, only Max's own pages can reach its internals, only they get the microphone, and links open in your browser. Electron is kept current (45.x).

## Install

Download `MaxCode-Setup.exe` from the [Releases](https://github.com/nihalayoob07/maxcode/releases) page and run it. It installs, adds a desktop shortcut and opens. Windows may warn about an unknown publisher (the app isn't code-signed yet): click **More info → Run anyway**.

## Get an NVIDIA key

1. Go to [build.nvidia.com/settings/api-keys](https://build.nvidia.com/settings/api-keys) and sign in (free).
2. **Generate API Key**, copy it (it starts with `nvapi-`).
3. Paste it into Max Code. To change it later: right-click Max → **Settings**.

## The server

`server/` is a small Vercel project (team nova, https://maxcode-server-weld.vercel.app): `api/chat.js` (Max's two NVIDIA models only), `api/speak.js` (ElevenLabs), and `lib/limits.js` (per install / per IP / total daily caps in Upstash Redis; `node lib/limits.js` checks them). It needs `NVIDIA_API_KEY`, `ELEVENLABS_API_KEY` and an Upstash Redis store connected in Vercel. Deploy it with `vercel deploy --prod` from the repo root: the project's Root Directory is `server/` and `.vercelignore` uploads only that folder. (Pushes to main usually deploy it too, but not reliably.)

## Build it yourself

```bash
npm install
npm start          # run it
npm run dist       # Windows installer in dist/MaxCode-Setup.exe
```

Releases: push a tag like `v0.1.0` and the GitHub Action builds the installer and attaches it to a release.
