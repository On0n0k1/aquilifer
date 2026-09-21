# Limitations & downsides

Every project has tradeoffs. This page exists so they're written down plainly instead of left for you to discover after the fact; the goal is that nothing here should surprise you.

## Security & storage

- **API keys are stored as plain text by default.** The [vault](/docs/vault) is optional, off by default. `chrome.storage.local` is sandboxed from websites (no site can ever read it), but it isn't encrypted on disk. This is an accepted tradeoff: an API key is revocable and cheap to rotate if it's ever exposed some other way, unlike, say, a cryptocurrency wallet's private key.
- **The vault, once turned on, only encrypts API keys**, not your request history, not your connected-site list. If you're typing anything sensitive into a site that uses Aquilifer, a record of it sits in local, unencrypted browser storage regardless of whether the vault is on. See [History](/docs/history) and [The vault](/docs/vault).
- **The vault has no password recovery.** Forgetting it permanently loses access to the API keys it protected; you'd re-add those providers with a fresh key. This is by design, not an oversight (see [The vault](/docs/vault) for why).
- **Rate limits protect against accidents, not a determined attacker.** They're self-configured and self-imposed: a real safeguard against a bug or an unexpectedly chatty integration running up your bill, not a security boundary enforceable against a hostile site that's determined to work around it.

## What Aquilifer doesn't do

- **Requires a pay-per-token API key, not a consumer subscription.** Every [provider](/docs/providers) Aquilifer connects to is authenticated with that provider's own API key, billed per token used. A Claude Pro/Max subscription, a ChatGPT Plus subscription, or a GitHub Copilot subscription is a different product with a different authentication model (a logged-in session, not an API key) and can't be used here; connecting a provider means generating a key from that provider's own developer console, with its own separate, usage-based billing on top of (not instead of) any consumer subscription you already pay for.
- **A site can never use two providers at once.** Exactly one provider is bound per site at a time; a provider-specific interface needing a different type triggers a switch (replacing the binding), never a second grant.
- **The generic chat interface is text-in, text-out only**: no tool use, images, or structured output. A site needing those has to use the [Anthropic Claude](/docs/anthropic-api) or [OpenAI-compatible](/docs/openai-compatible-api) interface instead, and accept being tied to that provider's native request shape.
- **No password/settings sync across devices.** Everything Aquilifer stores is local to one browser profile on one machine; connecting a provider on your laptop doesn't carry over to your desktop.

## Platform & maturity

- **Chrome (and other Chromium browsers) only, for now.** Aquilifer targets Manifest V3; Firefox, Safari, and other browsers aren't supported yet.
- **Not on the Chrome Web Store yet**: install from source (see [Installing](/docs/installing)). Updates aren't automatic until it's published there.

## Found something not listed here?

This page is meant to grow, not shrink. If you run into a limitation that isn't written down here, [open an issue](https://github.com/On0n0k1/aquilifer/issues).
