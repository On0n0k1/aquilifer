# The page-facing API

This page is for developers integrating Aquilifer into a website's own frontend code. Everything here runs in the browser, in a page that a user has approved: there is no backend involved. For full typing without hand-copying the shapes below, install [aquilifer-types](/docs/aquilifer-types); otherwise, this page and its sub-pages are the reference for hand-writing your own types against them.

## Before you start

`window.aquilifer` only exists in a browser tab where the user has the extension installed. Always feature-detect it:

```js
if (window.aquilifer) {
  // Aquilifer is installed
}
```

It's an `EventTarget`, so you can subscribe to changes the normal way (see [Events](#events) below).

## Connecting

```js
await window.aquilifer.request({ method: 'connect' });
```

The first call for a given site opens the approval popup described in [Connecting a site](/docs/connecting) and resolves once the user answers it. If they've already approved your site, it resolves immediately without a prompt.

## Which interface to use

- **[Generic API](/docs/generic-api)**: provider-agnostic `chat`/`stream`. Start here; it's what most integrations need, and it works no matter which provider the user has connected.
- **[Anthropic Claude](/docs/anthropic-api)**: Claude's own native request shape, for tool use, images, or structured output the generic interface doesn't cover.
- **[OpenAI-compatible](/docs/openai-compatible-api)**: the native OpenAI chat-completions shape, against OpenAI itself or a self-hosted/local backend.

## Other things you can check

```js
await window.aquilifer.request({ method: 'isConnected' });
// -> { connected: boolean }
```

Reports connection status **without ever opening the approval popup**, useful if your site wants to try Aquilifer only when it's already available, without risking a surprise prompt during something that looks unrelated.

```js
await window.aquilifer.request({ method: 'getProvider' });
// -> { type: 'anthropic' | 'openai-compatible', model: string }
```

Visibility only: never the user's label, credential, or self-hosted URL.

```js
await window.aquilifer.request({ method: 'getHistory' });
// -> your own site's past requests to the generic interface
```

```js
await window.aquilifer.request({ method: 'disconnect' });
```

## Events

```js
window.aquilifer.addEventListener('connect', (event) => {
  console.log(event.detail); // { type, model }, same shape as getProvider
});
window.aquilifer.addEventListener('permissionChanged', (event) => {
  // the user switched to a different provider
});
window.aquilifer.addEventListener('disconnect', () => {
  // the user revoked access
});
```

These fire in every open tab of your site, not just the one that triggered the change: handy if a user has your site open in more than one tab.

## Error handling

A failed call rejects with a real `Error`. For the identifiers below, `.code` is stable, safe to branch on without string-matching `.message`:

| `.code` | Meaning |
|---|---|
| `not_connected` | The site hasn't been approved yet; call `connect()` first. |
| `connect_denied` | The user declined the approval prompt. |
| `connect_pending` | A connect/switch prompt for this site is already open. |
| `missing_messages` | `params.messages` was empty. |
| `rate_limited` | The user's own rate limit was hit; see [Rate limiting](/docs/rate-limiting). Don't retry aggressively against this one. |
| `switch_denied` | The user declined a provider-specific interface's switch request. |
| `no_provider_of_type` | The user has no provider of the type a provider-specific interface needs. |
| `provider_unavailable` | The bound provider was deleted between requests. |
| `vault_locked` | The user's [vault](/docs/vault) is locked and they closed the unlock prompt without entering their password. |
| `streaming_not_supported` | `anthropicMessages`/`openaiChatCompletions` were called with `stream: true`; use the dedicated streaming methods instead. |

## Using Aquilifer as a fallback

If your site already has its own LLM integration and only wants to use Aquilifer when that's unavailable, three things stay true no matter what:

- You can never obtain the user's credentials this way, same as any other integration.
- You can never exceed the *user's own* configured rate limits: a fallback hammering retries after `rate_limited` defeats the purpose of the limit existing.
- You can only use whichever provider the user has already bound; calling a provider-specific interface for a different type triggers a switch prompt (see [Anthropic Claude](/docs/anthropic-api) or [OpenAI-compatible](/docs/openai-compatible-api)), not a silent override.

Use `isConnected()` to check before falling back, so you never risk surprising the user with an approval popup during what looks like an unrelated action.
