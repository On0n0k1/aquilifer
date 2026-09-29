# Installing

Aquilifer is on the Chrome Web Store. Installing from there is the recommended path for everyone who isn't working on Aquilifer itself; building from source is documented further down for contributors.

## Requirements

A Chromium-based browser (Chrome, Edge, Brave, etc.). Aquilifer currently targets Chrome's Manifest V3 only. Firefox and other browsers aren't supported yet.

Building from source additionally needs [Node.js](https://nodejs.org/) (a recent LTS version) and npm.

## Install from the Chrome Web Store

**[Add Aquilifer to Chrome](https://chromewebstore.google.com/detail/aquilifer/aflcbgcgkaenbkecookfmndjgmgdancg)**

Click **Add to Chrome**, then confirm the permission dialog (see the note below on what it's asking for). Aquilifer's icon should appear in your browser toolbar once it's installed.

Next: [connect a provider](/docs/providers) and [try connecting a site](/docs/connecting).

### About the "read and change all your data on all websites" warning

Chrome shows this in the install dialog, on the Web Store listing, and on the extension's `chrome://extensions` details page. It's expected, and it's what lets any website detect Aquilifer and offer to connect without you doing anything extension-specific first, the same MetaMask-style pattern `window.ethereum` uses. MetaMask itself requests the same broad access for the same reason. Aquilifer never acts on a page without your explicit, visible approval (see [Connecting a site](/docs/connecting)); the broad access is about where the connection *offer* can appear, not what it's allowed to do without you.

## Staying up to date

Chrome updates Web Store extensions automatically in the background, so a store install needs nothing from you. Each release is also tagged on [GitHub](https://github.com/On0n0k1/aquilifer/releases) if you want to read what changed.

A source install doesn't auto-update — see below.

## Installing from source

You only need this if you're developing Aquilifer or want to run an unreleased change. A source install and a store install are the same extension, but Chrome treats them as two separate items, so don't run both at once.

```sh
git clone https://github.com/On0n0k1/aquilifer.git
cd aquilifer
npm install
npm run build
```

Then load it:

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the `.output/chrome-mv3` folder that `npm run build` created.

To update a source install, pull and rebuild, then reload the extension from `chrome://extensions` (the reload icon on Aquilifer's card):

```sh
git pull
npm run build
```

See [CONTRIBUTING.md](https://github.com/On0n0k1/aquilifer/blob/main/CONTRIBUTING.md) for the full development setup.
