# Aquilifer

Aquilifer is a browser extension that acts as a secure LLM provider for websites — the same idea as MetaMask, but for LLM access instead of a crypto wallet.

A website never sees your API key. It asks the extension for a completion; the extension holds the credential, enforces your permissions and rate limits, and hands back only the response.

## Status

Early / pre-release. Actively developed, not yet published to the Chrome Web Store — install from source for now (below).

## How it works

- **You** connect the LLM provider(s) you actually want to use — an Anthropic API key, or any OpenAI-compatible endpoint (OpenAI itself, or a self-hosted/local backend like llama.cpp, Ollama, LM Studio). Credentials live only in the extension.
- **A website** asks for access via `window.aquilifer`. The first request opens a permission prompt naming the site — you approve or deny it. Once approved, that site can keep using the extension silently, backed by rate limits you control from the extension's own settings.
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

`window.aquilifer` also exposes `stream()` for the same generic interface, and dedicated `anthropicMessages()`/`openaiChatCompletions()` methods (plus their own `...Stream()` variants) for sites that want a specific provider's native request/response shape instead of the generic one.

## Installing from source

```sh
git clone https://github.com/On0n0k1/aquilifer-ext.git
cd aquilifer-ext
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
