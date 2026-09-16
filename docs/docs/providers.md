# Providers

A provider is a connection between Aquilifer and one LLM backend, using your own credential. You add providers from the extension's settings page (click the Aquilifer icon → **Options**, or right-click the icon → **Options**), before any website can use them.

## Two kinds of provider

**Anthropic** — Claude, using your own Anthropic API key. Pick a model family and version from a dropdown (or enter a custom model ID).

**OpenAI-compatible** — anything that speaks OpenAI's chat-completions format: OpenAI itself, or a self-hosted/local backend such as [llama.cpp](https://github.com/ggml-org/llama.cpp), [Ollama](https://ollama.com/), or [LM Studio](https://lmstudio.ai/). You provide a base URL (e.g. `http://localhost:8080`) and a model name; the API key is optional, since many local backends don't require one.

## Adding a provider

1. Fill in a label (just for your own reference — sites never see it), the credential, and the model.
2. Click **Save**. Aquilifer makes a real, minimal request to the provider to verify the credential and URL actually work before storing anything — if that fails, nothing is saved.
3. The model your provider's own response reports is what gets shown to a connected site (via `getProvider`), not necessarily the exact string you typed.

For a self-hosted/local backend, saving it the first time will also ask your browser for permission to make requests to that URL — this is a one-time browser permission prompt, separate from Aquilifer's own connect-a-site approval.

## Default provider and switching

The first provider you add becomes the default automatically. When a site connects for the first time, the approval popup lets you pick which provider to bind it to.

**Aquilifer binds exactly one provider to each site at a time.** If a site later needs a different type of provider than the one it's already bound to (for example, it wants to call Anthropic natively but you're bound to a self-hosted model), Aquilifer prompts you to **switch** — replacing the binding, not adding a second one. You can approve or deny that switch; denying it leaves the existing binding untouched.

## Removing a provider

Delete it from the same settings page. Any site currently bound to it will show `provider_unavailable` errors, or trigger a fresh connect/switch prompt, depending on what it asks for next.
