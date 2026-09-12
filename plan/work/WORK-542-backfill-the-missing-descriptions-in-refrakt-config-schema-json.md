{% work id="WORK-542" status="done" priority="high" complexity="moderate" source="SPEC-126" milestone="v0.33.0" tags="config,schema,docs,dx" %}

# Backfill the missing descriptions in refrakt.config.schema.json

Only 10 of 22 `SiteConfig` fields carry a `description`. These have none:

```
contentDir, overrides, routeRules, icons, tints,
baseUrl, siteName, defaultImage, logo
```

…plus all three `RunesConfig` fields (`prefer`, `aliases`, `local`), and the
same set at the top level.

`sites.md` has good prose for every one of them. Move it into the schema.

## Why this is its own work item

It has **standalone value independent of the generated reference**: schema
`description` fields are what editors show on hover, so a user hovering
`baseUrl` in VS Code currently gets nothing. Filling them fixes the editor
experience whether or not {% ref "SPEC-126" /%}'s generator ever lands.

It is also the bulk of the generator work. {% ref "WORK-544" /%} is small once
this is done, and large if it is not — separating them keeps that visible rather
than hidden inside a "write a generator" estimate.

## Acceptance Criteria
- [x] Every property in `refrakt.config.schema.json` has a `description`, at both the top level and inside every definition
- [x] The prose reads as user-facing documentation, not implementation notes
- [x] `sites.md` and `overview.md` are not left contradicting the schema — where prose moved, the page keeps its narrative and drops the duplicated sentence
- [x] `config-schema.test.ts` asserts every property carries a non-empty `description`

## Approach

Lift the existing prose from `sites.md`'s field tables rather than writing new
copy — it is already good, and rewriting invites drift between what the table
said and what the schema now says.

Two things to watch:

**Write for the reader, not the implementer.** {% ref "SPEC-126" /%} D2 notes that
several existing descriptions read like implementation notes. These become both
the editor hover text and the generated reference body, so they are user-facing
prose now.

**`$ref` properties inherit from their target.** `highlight`, `sandbox`, `runes`,
and `theme` take their description from the definition they point at —
`HighlightConfig.description` already carries the whole "use `theme.presets`
instead" paragraph. Do not duplicate it onto the property.

The new assertion is what stops this regressing: without it, the next added
field arrives description-less and nothing says so.

## Blocked by

- {% ref "WORK-541" /%} — not strictly, but the drift test reads the interface path, so landing the split first avoids editing the same test twice.

## Resolution

Completed: 2026-09-10

Branch: `claude/content-author-docs-org-vps1un`

### What was done

**`packages/transform/refrakt.config.schema.json`** — 20 descriptions added, so
every non-`$ref` property at the top level and in every definition now carries
one. Prose lifted from `sites.md`'s field tables and `plugins.md`'s
conflict-resolution section rather than newly written, so the schema and the
pages say the same thing.

`$ref` properties are left alone deliberately: they inherit from the definition
they point at, and a second copy would be a second thing to keep in sync.

**`packages/transform/test/config-schema.test.ts`** — new `gives every property
a description` assertion, exempting `$ref` properties and naming the offenders
by `Definition.property` when it fails.

### Notes

- Standalone value regardless of the generator: these are the strings an editor
  shows on hover, so hovering `baseUrl` in VS Code now says something.
- Verified the new assertion bites: removing `SiteConfig.baseUrl`'s description
  failed the test naming exactly that field.
- **Two false starts worth recording.** Round-tripping the file through
  `json.dumps` reformatted every compact one-liner — 254 insertions for 20
  additions — so the edit is textual instead, and the diff is 20 lines changed.
  Then a naive "does this object start with a description?" check produced a
  *duplicate* `description` key on top-level `contentDir`, which already had one
  in a later position. `JSON.parse` accepts duplicates silently (last wins), so
  the test passed and only reading the diff caught it. The final pass scans each
  property's balanced object text before inserting.
- Top-level `contentDir` kept its existing "Legacy shorthand" description; the
  new prose went to `SiteConfig.contentDir`, which is the field a user writes.
- Full suite 4264 passing.

{% /work %}
