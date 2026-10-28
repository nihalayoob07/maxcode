# Max Code

Max's coding tutor and debugger as its own Windows app. No server, no setup: install it, paste a free NVIDIA API key once, and go.

- **Debug my code**: reads the file open in VS Code, Cursor or Windsurf, finds the bugs, and applies the fixes you accept.
- **Debug a file / Explain code**: drop a file or paste a program.
- **Ask anything**: "how do pointers work in C" gives a lesson with an example you can step through.
- **Courses**: C, C++, Python, Java, JavaScript, C#, Go, Rust. Progress is saved on the PC.

It needs internet: answers come from NVIDIA Nemotron on build.nvidia.com, using the user's own key. The key is stored encrypted on the PC (Windows DPAPI) and only ever sent to NVIDIA.

## Install

Download `MaxCode-Setup.exe` from the [Releases](https://github.com/nihalayoob07/maxcode/releases) page and run it. It installs, adds a desktop shortcut and opens. Windows may warn about an unknown publisher (the app isn't code-signed yet): click **More info → Run anyway**.

## Get an NVIDIA key

1. Go to [build.nvidia.com/settings/api-keys](https://build.nvidia.com/settings/api-keys) and sign in (free).
2. **Generate API Key**, copy it (it starts with `nvapi-`).
3. Paste it into Max Code. To change it later: **Home → Change NVIDIA key**.

## Build it yourself

```bash
npm install
npm start          # run it
npm run dist       # Windows installer in dist/MaxCode-Setup.exe
```

Releases: push a tag like `v0.1.0` and the GitHub Action builds the installer and attaches it to a release.
