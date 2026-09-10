{% work id="WORK-542" status="ready" priority="high" complexity="moderate" source="SPEC-126" milestone="v0.33.0" tags="config,schema,docs,dx" %}

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
- [ ] Every property in `refrakt.config.schema.json` has a `description`, at both the top level and inside every definition
- [ ] The prose reads as user-facing documentation, not implementation notes
- [ ] `sites.md` and `overview.md` are not left contradicting the schema — where prose moved, the page keeps its narrative and drops the duplicated sentence
- [ ] `config-schema.test.ts` asserts every property carries a non-empty `description`

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

{% /work %}
