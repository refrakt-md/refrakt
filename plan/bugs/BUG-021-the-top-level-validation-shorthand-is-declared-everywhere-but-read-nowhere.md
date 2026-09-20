{% bug id="BUG-021" status="fixed" severity="minor" source="SPEC-132" tags="config, validation, dx" milestone="v0.36.0" pr="refrakt-md/refrakt#622" %}

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

## Resolution

Completed: 2026-09-20

Branch: `claude/bug-021-validation-shorthand`

### What was done

- `packages/transform/src/config-normalize.ts` — added `'validation'` to
  `SITE_FIELDS`, the one list of the four declaration sites with behaviour
  attached. Restores both directions the list drives: the shorthand folds into
  the site config at load, and `refrakt config migrate` moves it into `site`.
- `packages/transform/test/config-normalize.test.ts` — six tests: the fold, all
  three sub-fields, `validation` alone being enough to trigger the flat shape,
  the site → top-level mirror, and the mixed-shape case below.

### The bug's own Steps to Reproduce were wrong

Worth recording, because verifying the fix against them would have looked like
a failure. The documented repro is:

```json
{ "validation": {...}, "sites": { "main": {...} } }
```

That config takes the `hasPlural` branch of `normalizeRefraktConfig`, where
top-level shorthands are ignored **wholesale** — not just `validation`. A
control proves it is not validation-specific: `sandbox`, which was already in
`SITE_FIELDS`, is equally ignored in that shape.

The shorthands are the *flat shape*: they apply to a config with no
`site`/`sites` key at all. The real defect is the pure-flat case
(`{ validation, contentDir }`), where `validation` was dropped while every
other shorthand survived. That is what the fix addresses, and it is pinned by a
test alongside one pinning the mixed-shape behaviour so the distinction is not
rediscovered.

### Verified

End to end through `normalizeRefraktConfig` → `resolveSite` → `loadContent`,
against a page producing an `attribute-undefined` finding:

| Config | Finding |
|---|---|
| no validation | `error` |
| per-site `validation` | suppressed |
| top-level shorthand | suppressed *(was: `error`)* |

The shorthand now behaves identically to the per-site form. 4,589 tests pass.

### Notes

- Chose the "add to `SITE_FIELDS`" fix over removing the declaration. Both were
  valid per the bug; adding it is one line, restores the migrate path for free,
  and keeps the field consistent with the other eighteen shorthands rather than
  making `validation` the one documented option that does not work flat.
- The mirror direction was confirmed, not assumed: nothing reads top-level
  `validation`, and a test now pins the shape it takes so that stays an
  observation rather than an argument from absence.

{% /bug %}
