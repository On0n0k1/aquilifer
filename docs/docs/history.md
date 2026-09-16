# History

Every request a connected site makes is logged — which site, when, what was asked, and what came back (or the error, if it failed). It's a read-only audit log for *you*, viewable from the **History** tab in settings.

## It's audit-only, never replayed

Aquilifer never feeds history back into a future request. Every call is stateless — a site sends the full conversation it wants answered on that one call, exactly like calling the underlying provider's API directly. This is deliberate: it avoids silent, creeping token costs from an ever-growing conversation you didn't ask to keep paying for, and it means history is purely something you can look back at, not something that quietly affects behavior.

## Kept separately per interface

Aquilifer's generic chat interface and each provider-specific interface keep their own history log, viewable from separate tabs — so if you only ever use one, its log doesn't get lost in a mix of everything.

## What it doesn't do

- History is **not sent anywhere** — it's stored locally in the browser, like everything else Aquilifer keeps.
- It's **not encrypted**, even if you've turned on [the vault](/docs/vault) — the vault only protects API keys. If you're typing anything sensitive into a site that uses Aquilifer, know that a record of it sits in local, unencrypted browser storage. See [Limitations](/docs/limitations) for more on this.
- A connected site can read its *own* history back (so it can show a user their own past requests, for example) — never another site's.
