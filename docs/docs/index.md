# Overview

Aquilifer is a browser extension that acts as a secure LLM provider for websites — the same idea as a crypto wallet extension like MetaMask, but for LLM access instead of a blockchain account.

A website never sees your API key. It asks the extension for a completion; the extension holds the credential, enforces your permissions and rate limits, and hands back only the response.

## The three things that never change

However this project grows, these stay true — they're the entire point of it, not implementation details that might get relaxed later:

- **The website can never obtain your credentials.** It gets a completion, never a key.
- **The website can never choose which provider answers.** You bind a provider to a site when you connect it; the site only ever sends prompts and receives completions.
- **Your own usage limits always apply**, regardless of why a site is calling — including if it's only using Aquilifer as a fallback for its own, separate integration.

## What's on this page vs. the rest of the docs

- **[Installing](/docs/installing)** — how to get it running today (it isn't on the Chrome Web Store yet).
- **[Connecting a site](/docs/connecting)** — the approval flow, and what "connect once, then silent" actually means.
- **[Providers](/docs/providers)** — Anthropic, OpenAI, and self-hosted/local models.
- **[Rate limiting](/docs/rate-limiting)** and **[History](/docs/history)** — the controls and the audit log that back the trust model.
- **[The vault](/docs/vault)** — optional password-based encryption for stored API keys, and importantly, what it does *not* protect.
- **[The page-facing API](/docs/api)** — for developers integrating Aquilifer into a website.
- **[Limitations & downsides](/docs/limitations)** — read this one. Every project has tradeoffs; this page is where they're written down instead of left for you to discover.
