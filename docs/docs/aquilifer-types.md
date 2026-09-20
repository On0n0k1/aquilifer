# aquilifer-types

A planned companion npm package: TypeScript types for `window.aquilifer`, so a website integrating Aquilifer gets full typing without hand-copying shapes from [the page-facing API docs](/docs/api).

## Not published yet

`aquilifer-types` is a reserved name, not a published package. Work on it hasn't started, deliberately deferred until [the page-facing API](/docs/api) is considered stable, since a breaking change there would mean a breaking change here too. Until it exists, hand-write your own types against [the page-facing API](/docs/api) and its [generic](/docs/generic-api), [Anthropic Claude](/docs/anthropic-api), and [OpenAI-compatible](/docs/openai-compatible-api) sub-pages, or copy the shapes directly.

## What it will ship

- The `window.aquilifer` type declaration itself, plus every type it depends on (across [the page-facing API](/docs/api) and its [generic](/docs/generic-api), [Anthropic Claude](/docs/anthropic-api), and [OpenAI-compatible](/docs/openai-compatible-api) sub-pages).
- The provider-specific request/response/stream types, derived from the official `@anthropic-ai/sdk` and `openai` packages so they track each provider's own API shape rather than a hand-maintained copy.
- Two small runtime helpers: `getAquilifer()` (returns `window.aquilifer` if present, `undefined` otherwise) and `isAquiliferAvailable()` (the same check as a boolean). Small enough that there's exactly one sane behavior for each, nothing to get wrong in a first release.
- Zero runtime cost for the types themselves: everything is erased at compile time, the same way Aquilifer's own extension code only ever `import type`s from the official provider SDKs.

## What it won't ship yet

- A fallback-pattern helper (see [Using Aquilifer as a fallback](/docs/api#using-aquilifer-as-a-fallback)). Nobody's built a real fallback integration against Aquilifer yet, and this needs real usage to design against rather than guessing upfront and risking a breaking change later.
- Any backend or server code. `window.aquilifer` only exists inside a browser tab with the extension installed, so a package aimed at server code would be solving a problem that doesn't exist here.

## Package name status

`aquilifer-types` is confirmed available and reserved specifically for this package. A separate placeholder package, `aquilifer` (no `-types` suffix), is already published as a minimal stub purely to hold that bare name against squatting; it isn't this package, and isn't meant to be installed.
