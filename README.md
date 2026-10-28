# Max Code

Max's coding tutor and debugger as its own Windows app. No server, no setup: install it, paste a free NVIDIA API key once, and go.

Max hides under the bottom of your screen with just a raised hand peeking out for 2 minutes, then out of sight. Click the hand, or press **Ctrl+Alt+M** any time (change the shortcut in Settings), and he pops up as a small chibi (curly hair, glasses, laptop). Click him to open his panel, drag him anywhere, right-click for Settings or Quit. After 5 idle minutes he hides again.

He dresses for the time of day: pyjamas and a nightcap at night (with zzz after midnight), droopy eyes, yawns and coffee early in the morning, sneaky bites of a sandwich at lunch, a backwards cap at weekends, and a witch hat and pumpkin for Halloween, a Santa hat at Christmas and a party hat at New Year. He jumps and sparkles when a bug gets fixed or you get a practice answer right. The schedule is in `ui/costume.js` (`node ui/costume.js` checks it). He looks at his laptop while he's thinking.

- **Debug my code**: reads the file open in VS Code, Cursor or Windsurf, finds the bugs, and applies the fixes you accept.
- **Debug a file / Explain code**: drop a file or paste a program.
- **Ask anything**: "how do pointers work in C" gives a lesson with an example you can step through.
- **Courses** (in his panel): 43 languages, from HTML, CSS, JavaScript, Python and SQL to Rust, Haskell, COBOL and Assembly, with a search box. Progress is saved on the PC.
- **Talk to him**: click the mic in his panel (or press the call shortcut again while it's open) and speak; he answers out loud. Voice in and out is ElevenLabs, with your own key (optional: without it he types).
- **Your level**: Beginner, Intermediate or Expert in Settings. Beginners get plain words and the simplest examples; experts get terse, precise answers with edge cases.
- **Settings** (a normal window): the NVIDIA key, the call shortcut, theme, keep Max on top, start with Windows.
- **Looks**: light theme is Paper (warm white, black ink); dark theme is Frost (translucent slate glass). It follows Windows unless you pick one in Settings.

It needs internet: answers come from NVIDIA Nemotron on build.nvidia.com, using the user's own key. The key is stored encrypted on the PC (Windows DPAPI) and only ever sent to NVIDIA.

## Install

Download `MaxCode-Setup.exe` from the [Releases](https://github.com/nihalayoob07/maxcode/releases) page and run it. It installs, adds a desktop shortcut and opens. Windows may warn about an unknown publisher (the app isn't code-signed yet): click **More info → Run anyway**.

## Get an NVIDIA key

1. Go to [build.nvidia.com/settings/api-keys](https://build.nvidia.com/settings/api-keys) and sign in (free).
2. **Generate API Key**, copy it (it starts with `nvapi-`).
3. Paste it into Max Code. To change it later: right-click Max → **Settings**.

## Build it yourself

```bash
npm install
npm start          # run it
npm run dist       # Windows installer in dist/MaxCode-Setup.exe
```

Releases: push a tag like `v0.1.0` and the GitHub Action builds the installer and attaches it to a release.
