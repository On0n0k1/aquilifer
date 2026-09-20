# Anthropic Claude API

Aquilifer's native pass-through to Anthropic's own Messages API, for sites that need Claude-specific features (tool use, images, structured output) the [generic API](/docs/generic-api) doesn't cover.

## Sending a message

```js
const response = await window.aquilifer.anthropicMessages({
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

The body matches the real Anthropic Messages API request shape (minus `model`, which Aquilifer always sets to whatever the user's bound provider actually is) and returns the real response shape.

## Streaming

A dedicated streaming method, `anthropicMessagesStream(body)`, yields the provider's own raw streaming events, not a simplified shape.

## If the user isn't bound to an Anthropic provider

Calling this when the user's bound provider doesn't match its type doesn't just fail: it prompts the user to switch (see [Connecting a site](/docs/connecting)). Design for that as a normal, expected outcome, not an error path to work around.
