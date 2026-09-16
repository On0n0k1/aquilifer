# Installing

Aquilifer isn't published to the Chrome Web Store yet — for now, install it from source.

## Requirements

- [Node.js](https://nodejs.org/) (a recent LTS version) and npm.
- A Chromium-based browser (Chrome, Edge, Brave, etc.) — Aquilifer currently targets Chrome's Manifest V3 only. Firefox and other browsers aren't supported yet.

## Build it

```sh
git clone https://github.com/On0n0k1/aquilifer.git
cd aquilifer
npm install
npm run build
```

## Load it into your browser

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the `.output/chrome-mv3` folder that `npm run build` created.

Aquilifer's icon should now appear in your browser toolbar. Next: [connect a provider](/docs/providers) and [try connecting a site](/docs/connecting).

## Staying up to date

Since this isn't on the Web Store yet, updates aren't automatic. Pull the latest changes and rebuild:

```sh
git pull
npm run build
```

Then reload the extension from `chrome://extensions` (the reload icon on Aquilifer's card).
