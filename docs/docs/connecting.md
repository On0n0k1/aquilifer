# Connecting a site

The first time a website asks Aquilifer for anything, you get an approval popup: plain language, naming the site, asking which of your providers (if you have more than one) to bind to it. You approve or deny it.

## Connect once, then silent

Once you've approved a site, it doesn't ask again for ordinary use. That's deliberate, matching how a real extension should feel rather than nagging on every single request. What backs that instead of a popup on every call:

- **Rate limits** (see [Rate limiting](/docs/rate-limiting)) cap how much any one site can use, automatically, without needing your attention each time.
- **History** (see [History](/docs/history)) keeps a record of every request a connected site has made, so you can review it later.
- **You can disconnect a site at any time**, from the extension's settings, or with one click from [the toolbar popup](/docs/popup) if it's the site you currently have open, revoking its access immediately.

## Switching providers

A site is only ever bound to one provider. If it later needs a different *type* of provider than the one it's currently bound to (for example, it wants to talk to Anthropic natively, but you're currently bound to a self-hosted model), you get a **switch** prompt instead of a plain connect prompt. It's worded differently ("wants to switch from X to your Anthropic provider") so it's clear this replaces the existing binding rather than adding a second one. Denying a switch leaves the site's current binding untouched; nothing breaks, that one specific call just fails.

## What if you close the popup without answering?

Closing it (or clicking Deny) counts as a denial. The site's request fails with a plain error; nothing is connected, and it can ask again later if you change your mind.

## Managing connected sites

The **Connected sites** tab in Aquilifer's settings lists every site you've approved and which provider it's bound to, with a one-click **Disconnect** for each. [The toolbar popup](/docs/popup) also shows a Disconnect button for whichever site you currently have open, without needing to go into settings.
