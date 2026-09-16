# Contributing to Aquilifer

Thanks for wanting to contribute. This document covers what's expected of a change before it's merged: how to set up the project, what to run before opening a pull request, and — most importantly — the commit message format, since it directly drives this repo's automated versioning.

## Development setup

```sh
npm install
npm run dev          # starts the extension in dev mode (Chrome)
npm run dev:firefox  # same, for Firefox
```

## Before opening a pull request

Run these locally — CI runs the same checks automatically, but catching problems before you push saves a round trip:

```sh
npm run lint      # Biome — formatting + linting
npm run compile   # TypeScript, no emit
npm test          # unit + component tests (vitest)
npm run build     # production build
```

`npm run lint:fix` auto-fixes most formatting and simple lint issues — run it before `npm run lint` if you haven't been formatting as you go.

The end-to-end suite (`npm run test:e2e`) needs a real Chromium build first:

```sh
npx playwright install chromium   # one-time, per machine
npm run build                     # e2e tests load the built extension
npm run test:e2e
```

### What CI checks

- **Every push and PR**: lint, typecheck, unit + component tests, build.
- **PRs only**: the end-to-end suite (slower — needs a real Chromium download and a headed browser launch).

A pull request won't be merged with any of these failing.

## Commit messages — Conventional Commits, and why the format matters here

This repo follows [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`, imperative mood, summary line under ~72 characters. Common types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `ci`.

```
fix(background): resolve stale grant after provider deletion

feat(approve): add sign-up link for providers with no configured account
```

This isn't just a style preference — merges to `main` run [semantic-release](https://semantic-release.gitbook.io/), which reads these commit messages to automatically decide the next version number, generate a changelog entry, and cut a GitHub release. The type of change you write directly determines what happens:

| Commit | Result |
|---|---|
| `fix: ...` | Patch release (`1.2.3` → `1.2.4`) |
| `feat: ...` | Minor release (`1.2.3` → `1.3.0`) |
| A commit with a `BREAKING CHANGE:` footer (see below) | Major release (`1.2.3` → `2.0.0`) |
| `docs:`, `chore:`, `test:`, `ci:`, `refactor:`, etc. | No release on their own |

### Signaling a breaking change

Add a footer paragraph starting **exactly** with `BREAKING CHANGE:` — this works on a commit of any type, not just `feat`:

```
feat(api): remove chat()'s raw-string overload

BREAKING CHANGE: chat() no longer accepts a plain string argument;
pass { messages: [...] } instead.
```

**The `feat!:`/`fix!:` shorthand does not work in this repo** — this project's release tooling uses a commit parser that doesn't recognize the `!` marker, so a commit written that way won't be treated as breaking (and may not even be counted correctly as a `feat`/`fix`). Always use the full `BREAKING CHANGE:` footer instead.

## Commit signing

Every commit must be both:

- **Signed off** (Developer Certificate of Origin) — `git commit -s`
- **GPG-signed** — `git commit -S`

Combined: `git commit -s -S -m "..."`. If you don't already have a GPG key set up for git, see GitHub's guide: [Signing commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits). Unsigned or unverified commits won't be merged.

## Code style

Formatting (indentation, quote style, import order) is enforced and auto-fixable by Biome (`npm run lint:fix`) — don't hand-format, let the tool do it. Beyond formatting, prefer small, focused commits over batching unrelated changes together, and avoid adding abstractions, error handling, or fallbacks for cases that can't actually happen.
