{% bug id="BUG-021" status="confirmed" severity="minor" source="SPEC-132" tags="config, validation, dx" milestone="v0.36.0" %}

# The top-level validation shorthand is declared everywhere but read nowhere

{% ref "WORK-559" /%} added `validation` to `RefraktConfig` "as a deprecated
shorthand, matching `sandbox`". The type is there, the JSON Schema declares it,
the generated reference documents it — and nothing reads it.

A user who configures validation the documented shorthand way gets editor
autocomplete, schema shape-checking, no warning, and **no effect**.

## Steps to Reproduce

Put the shorthand at the top level of `refrakt.config.json`:

```json
{
  "validation": { "disableIds": ["attribute-undefined"] },
  "sites": { "main": { "contentDir": "./site/content" } }
}
```

Build a site that produces an `attribute-undefined` finding.

## Expected

The finding is demoted to `info` and leaves the build summary, per
{% ref "WORK-559" /%}'s disposition table — the same as writing
`sites.main.validation`.

## Actual

The finding is reported at its original severity. The shorthand is inert.

## Why

Three facts, each verifiable in isolation:

| Check | Result |
|---|---|
| Readers of a `validation` key in `packages/*/src` and `plugins/*/src` | **one** — `packages/content/src/site.ts:354` |
| What that reader reads | `opts.siteConfig.validation` — the **per-site** object |
| Is `validation` in `SITE_FIELDS`? | **no** |

`SITE_FIELDS` (`packages/transform/src/config-normalize.ts:80`) is the list that
makes a shorthand work. Its own doc comment is explicit about the contract:

> This is the canonical legacy-shorthand set: the same fields the flat shape
> accepted at the top level. `refrakt config migrate` consumes it to run the
> inverse operation (top level → `site`), so both directions stay in step — keep
> this the single definition rather than hand-copying it.

`sandbox`, `baseUrl`, `siteName` and fifteen others are in it. `validation` is
not — so it is neither folded into the site config at load, nor moved by
`refrakt config migrate`.

The declaration landed in three places and missed the fourth, which is the only
one with behaviour attached.

## Fix

Add `'validation'` to `SITE_FIELDS`. That is one line, and it restores both
directions at once because the list drives both.

Two things to confirm while doing it, rather than assuming:

- **The mirroring direction.** `SITE_FIELDS` also mirrors site → top level when
  there is exactly one site, "so adapters that read `config.contentDir` keep
  working". Check that a mirrored `validation` is harmless for every adapter —
  nothing reads it at the top level today, which suggests it is, but that is an
  argument from absence.
- **Whether the shorthand should exist at all.** `validation` is new in
  v0.34.0. The other entries are legacy shapes carried for compatibility;
  this one was born deprecated. Removing the declaration from
  `packages/types/src/config.ts`, the schema and the reference is also a valid
  fix, and arguably the cleaner one — nothing can be relying on a shorthand
  that has never worked.

Whichever way it goes, the current state is the worst of the three: documented,
schema-validated, and silent.

## Notes

Found while working {% ref "SPEC-135" /%} item ② — establishing whether
`refrakt validate` and the build could disagree about which findings are
errors. They cannot, because {% ref "WORK-559" /%} put the policy and its
resolution inside one exported module and `loadContent` reads the settings
itself. The shorthand is the one place that reasoning does not reach.

There is an irony worth recording: this is the validation feature's own
configuration silently doing nothing when set the documented way — the exact
failure class {% ref "SPEC-132" /%} and its milestone exist to remove.

## References

- {% ref "WORK-559" /%} — added the field, the schema definition and the reference section
- {% ref "SPEC-132" /%} — the validation feature this configures
- {% ref "SPEC-135" /%} — item ②, where this surfaced
- `packages/transform/src/config-normalize.ts` — `SITE_FIELDS`, the list it is missing from
- `packages/content/src/site.ts` — the only reader, and it reads per-site
- `packages/types/src/config.ts` — the deprecated declaration

{% /bug %}
