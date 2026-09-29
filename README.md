<p align="center">
  <img src="public/aquila.png" alt="Aquilifer" width="140">
</p>

<h1 align="center">Aquilifer</h1>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/aquilifer/aflcbgcgkaenbkecookfmndjgmgdancg">Add to Chrome</a> ·
  <a href="https://on0n0k1.github.io/projects/aquilifer/">Website</a> ·
  <a href="https://on0n0k1.github.io/projects/aquilifer/docs/">Docs</a> ·
  <a href="https://on0n0k1.github.io/projects/aquilifer/docs/installing">Install</a> ·
  <a href="https://on0n0k1.github.io/projects/aquilifer/docs/limitations">Limitations</a>
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/aquilifer/aflcbgcgkaenbkecookfmndjgmgdancg"><img src="https://img.shields.io/chrome-web-store/v/aflcbgcgkaenbkecookfmndjgmgdancg?label=chrome%20web%20store" alt="Chrome Web Store version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License: Apache-2.0"></a>
</p>

Aquilifer is a browser extension that acts as a secure LLM provider for websites: the same idea as MetaMask, but for LLM access instead of a crypto wallet.

A website never sees your API key. It asks the extension for a completion; the extension holds the credential, enforces your permissions and rate limits, and hands back only the response. No backend for the site to run, no per-user API cost for the site's developer to carry; the user's own key pays for their own usage.

## Status

Released and actively developed: Aquilifer is [on the Chrome Web Store](https://chromewebstore.google.com/detail/aquilifer/aflcbgcgkaenbkecookfmndjgmgdancg). Being shipped doesn't mean feature-complete — the [docs site](https://on0n0k1.github.io/projects/aquilifer/) reflects what's actually implemented, and its [limitations page](https://on0n0k1.github.io/projects/aquilifer/docs/limitations) is an honest look at what isn't yet.

## What developers get

- **No API bill.** Every request runs on the user's own credential, not the site's: no per-user cost to budget for.
- **No backend required.** `window.aquilifer` runs entirely client-side, so the rest of the site can stay static.
- Both a **generic, provider-agnostic interface** and **provider-specific interfaces** (Anthropic's native Messages shape, OpenAI's Chat Completions shape) for sites that want to avoid an abstraction layer.

## What users get

- **Choice of provider**: Anthropic, any OpenAI-compatible endpoint (OpenAI itself, or a self-hosted/local backend like llama.cpp, Ollama, or LM Studio), switchable at any time.
- **Usage control**: two-tier rate limits (global and per-interface), configured from the extension's own settings, not the website's.
- **A full audit log** of every request made on your behalf, viewable from the extension, never fed back into future requests.
- **Optional password-based encryption** for stored API keys (the vault); see [its docs](https://on0n0k1.github.io/projects/aquilifer/docs/vault) for exactly what it does and doesn't protect.

## How it works

- **You** connect the LLM provider(s) you actually want to use: an Anthropic API key, or any OpenAI-compatible endpoint. Credentials live only in the extension.
- **A website** asks for access via `window.aquilifer`. The first request opens a permission prompt naming the site; you approve or deny it. Once approved, that site can keep using the extension silently, backed by rate limits you control from the extension's own settings.
- **The website never picks which provider answers.** You bind a provider to a site at connect time; the site only ever sends prompts and gets completions back.

## For websites integrating Aquilifer

```js
if (window.aquilifer) {
  await window.aquilifer.request({ method: 'connect' });

  const { message } = await window.aquilifer.request({
    method: 'chat',
    params: { messages: [{ role: 'user', content: 'Hello!' }] },
  });
}
```

`window.aquilifer` also exposes `stream()` for the same generic interface, and dedicated `anthropicMessages()`/`openaiChatCompletions()` methods (plus their own `...Stream()` variants) for sites that want a specific provider's native request/response shape instead of the generic one. Full reference: [the page-facing API docs](https://on0n0k1.github.io/projects/aquilifer/docs/api).

For TypeScript, [`aquilifer-types`](https://github.com/On0n0k1/aquilifer-types) (`npm install aquilifer-types`) ships typed access to `window.aquilifer`, no hand-copying shapes from the docs.

## Installing

**[Add Aquilifer to Chrome](https://chromewebstore.google.com/detail/aquilifer/aflcbgcgkaenbkecookfmndjgmgdancg)** — the recommended path, and it auto-updates.

Chromium-based browsers only for now (Chrome, Edge, Brave); Firefox and Safari aren't supported yet. Full walkthrough, including what the install-time permission warning is asking for: [the installing docs](https://on0n0k1.github.io/projects/aquilifer/docs/installing).

### From source

For developing Aquilifer or running an unreleased change. Chrome treats a source install and a store install as two separate extensions, so don't run both at once.

```sh
git clone https://github.com/On0n0k1/aquilifer.git
cd aquilifer
npm install
npm run build
```

Then in Chrome: `chrome://extensions` → enable Developer mode → **Load unpacked** → select `.output/chrome-mv3`.

## Development

```sh
npm run dev   # dev mode, auto-reloads on change
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full setup, the pre-PR checklist, and commit conventions.

## License

[Apache License 2.0](LICENSE).
