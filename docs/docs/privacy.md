# Privacy policy

*Last updated: 2026-09-20.*

This page describes what Aquilifer, the browser extension, does with your data. It's written in plain language on purpose; where a claim needs more detail, it links to the relevant feature page rather than repeating it here.

## The short version

Aquilifer doesn't have a server. There is no Aquilifer-operated backend, database, or analytics endpoint anywhere in this project, so there's nothing for Aquilifer's developers to collect, see, or sell, because it's never sent to them in the first place. Everything Aquilifer stores lives in your browser's local storage, on your own machine, and the only network requests it ever makes are the ones *you* configured: directly from your browser to the LLM provider you connected (Anthropic, OpenAI, or a self-hosted endpoint you pointed it at).

## What Aquilifer stores, and where

All of it is in `chrome.storage.local` — sandboxed storage private to the extension, on your device, in your browser profile. None of it syncs to a Google account or any other cloud service.

- **Provider credentials** (API keys, base URLs, model selections you've configured). See [Providers](/docs/providers). Plain text by default; optionally encrypted at rest with a password you choose, via [the vault](/docs/vault) — see that page for exactly what the vault does and doesn't cover.
- **Connected-site grants**: which sites you've approved, and which provider each one is bound to. See [Connecting a site](/docs/connecting).
- **Request history**: the prompts and responses for every request a connected site has made, kept as a local audit log. See [History](/docs/history). This is never encrypted, vault or not, and is never sent anywhere or fed back into a future request.
- **Your own settings**: rate limits, notification cooldowns, and display preferences (font size, popup width). See [Rate limiting](/docs/rate-limiting) and [Appearance](/docs/appearance).

## What Aquilifer sends over the network, and to whom

Exactly one kind of outbound request: a completion request to the LLM provider *you* configured, sent directly from your browser using the credential you provided. If you connected an Anthropic key, requests go to Anthropic's API; if you pointed Aquilifer at a self-hosted model, requests go there instead. Aquilifer has no server of its own in that path; it doesn't proxy, log, or forward your requests anywhere else.

A connected website never receives your credential. It receives only the completion (and, for a provider-specific interface, that provider's response shape). See [The page-facing API](/docs/api) for exactly what a connected site can and can't do.

## No analytics, no tracking

Aquilifer doesn't include any analytics, telemetry, crash-reporting, or advertising code. It doesn't know how many people use it, what they ask their LLM, or which sites they've connected, because none of that ever leaves your browser.

## Your control over this data

- **Disconnect a site** at any time (the toolbar popup or Options' Connected Sites tab), which revokes its access immediately.
- **Remove a provider**, which deletes its stored credential.
- **Clear history** from the History tab.
- **Uninstalling the extension** deletes everything Aquilifer stored, the same as uninstalling any browser extension.

## Permissions this extension requests

- **`storage`**: to keep the data described above locally.
- **`activeTab`**: so the toolbar popup can show the current tab's connection status; granted only for the tab you clicked the toolbar icon on, never any other tab.
- **`notifications`**: to show a system notification when a site is rate-limit blocked.
- **Host access to every site**: `window.aquilifer` is injected on every page so any site can offer to use it, the same way a page checks for `window.ethereum`. This is what lets Aquilifer work on a site without that site needing to be special-cased ahead of time. It does not mean Aquilifer reads page content or browsing activity; the injected script only responds to a page's own explicit requests to `window.aquilifer`.

## Questions

Aquilifer is [open source, Apache 2.0 licensed](https://github.com/On0n0k1/aquilifer): the actual behavior described above is verifiable by reading the code, not just taking this page's word for it. If something here seems wrong or you have a question this page doesn't answer, [open an issue](https://github.com/On0n0k1/aquilifer/issues).
