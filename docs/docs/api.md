# The page-facing API

This page is for developers integrating Aquilifer into a website's own frontend code. Everything here runs in the browser, in a page that a user has approved: there is no backend involved, and there's no npm package to install yet (see [Limitations](/docs/limitations)).

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

## Asking for a completion

The generic interface works the same no matter which provider the user has connected: you never choose or see which one answers:

```js
const { message } = await window.aquilifer.request({
  method: 'chat',
  params: {
    messages: [{ role: 'user', content: 'Hello!' }],
  },
});
```

Every call is stateless: send the full conversation you want answered each time (see [History](/docs/history)).

### Streaming

```js
for await (const { delta } of window.aquilifer.stream({
  messages: [{ role: 'user', content: 'Write a haiku.' }],
})) {
  process(delta);
}
```

The loop ends normally on completion, or throws (catchable with `try`/`catch`) on failure, with no special "done" or "error" values to check for.

## Provider-specific interfaces

If you need a specific provider's native request shape (tool use, images, structured output, things the generic interface above doesn't cover), Aquilifer exposes each provider's real API shape directly, minus the credential:

```js
const response = await window.aquilifer.anthropicMessages({
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

```js
const response = await window.aquilifer.openaiChatCompletions({
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

Both bodies match the real Anthropic Messages API / OpenAI chat-completions request shape (minus `model`, which Aquilifer always sets to whatever the user's bound provider actually is) and return the real response shape. Streaming variants exist too: `anthropicMessagesStream(body)` and `openaiChatCompletionsStream(body)`, yielding the provider's own raw streaming events, not a simplified shape.

**Calling one of these when the user's bound provider doesn't match its type doesn't just fail**: it prompts the user to switch (see [Connecting a site](/docs/connecting)). Design for that as a normal, expected outcome, not an error path to work around.

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
- You can only use whichever provider the user has already bound; calling a provider-specific interface for a different type triggers the switch flow above, not a silent override.

Use `isConnected()` to check before falling back, so you never risk surprising the user with an approval popup during what looks like an unrelated action.
