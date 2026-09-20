---
layout: home

hero:
  name: Aquilifer
  text: A secure LLM provider for the web
  tagline: Websites ask Aquilifer for a completion. They never see your API key, only prompts in, answers out.
  image:
    src: /aquilaLarge.png
    alt: Aquilifer, a golden eagle standard
  actions:
    - theme: brand
      text: Get started
      link: /docs/
    - theme: alt
      text: View on GitHub
      link: https://github.com/On0n0k1/aquilifer

features:
  - title: For users
    details: Connect the LLM provider you actually want (Anthropic, OpenAI, or your own local/self-hosted model) once, from the extension's own settings. Choose which sites can use it, set your own usage limits, and keep a full log of every query made on your behalf.
  - title: For developers
    details: window.aquilifer is all you need, no backend to stand up, deploy, or pay for. The user's own key pays for their own usage, not yours, and since there's no server-side state to keep, the rest of the site can stay entirely static.
  - title: For companies
    details: Point it at your own internal or self-hosted model instead of a third-party API, with no code changes on the site's side. Apache 2.0 licensed, read it, audit it, fork it.
---

## How it works

1. **A user installs Aquilifer** and connects whichever LLM provider they want to use: an Anthropic API key, an OpenAI key, or a self-hosted endpoint like a local llama.cpp server. The credential is stored in the extension, nowhere else.
2. **A website asks for access** through `window.aquilifer`. The first time, Aquilifer shows a plain-language approval prompt naming the site; the user approves or denies it.
3. **Once approved, the site can request completions**, never the credential itself, never a way to change which provider answers. The user chose that when they connected it, and can revoke access at any time.

Curious what that actually looks like in code? Head to the [docs](/docs/).

## What developers get

- **No API bill.** Every request runs on the user's own credential, not yours: no per-user cost to budget for, and no surprise invoice from a feature going viral.
- **The user pays for their own usage**, directly with their own provider account, the same as if they'd typed the prompt into Claude or ChatGPT themselves.
- **No dynamic state to hold.** `window.aquilifer` runs entirely client-side, no backend proxy or session store just to keep a key off the client, so the rest of the site can stay 100% static.

## What users get

- **Control which LLM answers.** Anthropic, OpenAI, or a self-hosted/local model, whichever you already trust and pay for, picked by you, not the site.
- **Control your own usage.** Set your own rate limits from the extension; a site can't run your spend past what you've allowed it to.
- **Local LLMs work too.** Point Aquilifer at a local llama.cpp/Ollama/LM Studio server instead of a cloud API, and connected sites use it exactly the same way.
- **See every query.** A per-site, per-interface history log of every prompt and response, so you always know what was actually asked on your behalf.

## Why this exists

The usual way a website offers "AI features" is to run its own backend, hold an API key there, and proxy every request through it: infrastructure and cost the site owner carries even for a feature the *user* is the one who wants and would happily pay for with their own key. Aquilifer flips that: the browser extension is the trust boundary. The site never touches a credential; the user's key never leaves their own machine.

A site that wants this as a genuine fallback (its own integration first, Aquilifer only if that's unavailable) can do that too, without ever risking the user's spend limits or credentials.

Aquilifer is under active development; see the [docs](/docs/) for what's implemented today, and the [limitations page](/docs/limitations) for an honest look at what isn't yet.
