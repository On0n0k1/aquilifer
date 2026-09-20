# Generic API

The generic interface works the same no matter which provider the user has connected: you never choose or see which one answers. If you need a specific provider's native request shape instead, see [Anthropic Claude](/docs/anthropic-api) or [OpenAI-compatible](/docs/openai-compatible-api).

## Asking for a completion

```js
const { message } = await window.aquilifer.request({
  method: 'chat',
  params: {
    messages: [{ role: 'user', content: 'Hello!' }],
  },
});
```

Every call is stateless: send the full conversation you want answered each time (see [History](/docs/history)).

## Streaming

```js
for await (const { delta } of window.aquilifer.stream({
  messages: [{ role: 'user', content: 'Write a haiku.' }],
})) {
  process(delta);
}
```

The loop ends normally on completion, or throws (catchable with `try`/`catch`) on failure, with no special "done" or "error" values to check for.
