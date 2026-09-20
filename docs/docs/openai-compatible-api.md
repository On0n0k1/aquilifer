# OpenAI-compatible API

Aquilifer's native pass-through to an OpenAI-compatible chat-completions endpoint, for sites that need features the [generic API](/docs/generic-api) doesn't cover, against OpenAI itself or a self-hosted/local backend.

## Sending a message

```js
const response = await window.aquilifer.openaiChatCompletions({
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

The body matches the real OpenAI chat-completions request shape (minus `model`, which Aquilifer always sets to whatever the user's bound provider actually is) and returns the real response shape.

## Streaming

A dedicated streaming method, `openaiChatCompletionsStream(body)`, yields the provider's own raw streaming events, not a simplified shape.

## If the user isn't bound to an OpenAI-compatible provider

Calling this when the user's bound provider doesn't match its type doesn't just fail: it prompts the user to switch (see [Connecting a site](/docs/connecting)). Design for that as a normal, expected outcome, not an error path to work around.
