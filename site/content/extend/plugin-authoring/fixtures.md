---
title: Fixtures
description: The standardised rune-fixture format — Markdoc + YAML frontmatter — that powers examples, the gallery, the inspect command, docs, and AI few-shot.
---

# Fixtures

A **fixture** is a small, canonical example of a rune: the rune's actual
Markdoc, with optional YAML frontmatter carrying metadata. One source of truth,
many consumers — `RUNE_EXAMPLES`, the `inspect` command, the gallery, docs, and
AI few-shot all read fixtures. This page documents the format (SPEC-102).

## Where fixtures live

- **Core runes** — `packages/runes/fixtures/<rune>.md`.
- **Plugin runes** — a `fixtures/` directory at the plugin package root, shipped
  in the published package. The loader (`discoverPluginFixtures`) reads them by
  resolving the package.

A rune may also carry a single inline `fixture` string on its `PluginRune`
entry; a file fixture is preferred once a rune needs frontmatter or multiple
scenarios.

## The format

A fixture is the rune's Markdoc, optionally preceded by a YAML frontmatter
block:

```md
---
rune: recipe
role: canonical
attributes: { difficulty: medium, servings: "4" }
demonstrates: [metadata-bar, ingredients-list, numbered-steps]
notes: Keep ingredient lines terse; the steps carry the detail.
---

{% recipe difficulty="medium" servings="4" %}
## Ingredients
- 400g spaghetti
- 4 eggs

## Steps
1. Boil the pasta.
2. Toss with the sauce.
{% /recipe %}
```

A fixture with **no frontmatter** is still valid — every field defaults, and the
whole file is the body. The frontmatter block is stripped before the body is
parsed, so it never leaks into rendered output.

## Frontmatter fields

| Field | Type | Purpose |
|-------|------|---------|
| `rune` | string | The rune this fixture exercises (defaults to the filename's rune segment). |
| `title` / `description` | string | What this example demonstrates — editor, docs, gallery captions. |
| `role` | `canonical` \| `minimal` \| `rich` \| `edge-case` | Selection axis — see below. |
| `attributes` | mapping | The modifier values this scenario sets — drives the gallery variant matrix and `inspect`. |
| `demonstrates` | string[] | Concepts/features shown, as tags — docs + AI retrieval. |
| `notes` | string | Authoring guidance — *why* this fixture is good. Used as AI few-shot context. |

Unknown keys and wrong types are **rejected** — fixtures are schema-validated in
CI (see [Validation](#validation)).

## Roles — coverage vs. exemplar

`role` resolves the tension between two consumers:

- **`canonical`** — the representative, structurally complete example. The
  default for a bare `<rune>.md`. The gallery and `inspect` lean on this for
  structural coverage.
- **`minimal`** — the smallest valid usage.
- **`rich`** — a fully-dressed example showing many features at once; the AI
  generator and docs prefer these (with their `notes`) as few-shot exemplars.
- **`edge-case`** — an intentionally awkward input that should still render.

Every rune should have a **`canonical`** fixture; `plugin-validate` reports
runes that lack one.

## Multiple scenarios per rune

Use the filename to ship more than one scenario:

- `<rune>.md` — the single / canonical scenario.
- `<rune>.<scenario>.md` — a named scenario (e.g. `card.cover.md`,
  `recipe.minimal.md`).

This is what lets a rune's *structural* variants — a card with vs. without a
media zone, a recipe at minimal vs. rich — each be a first-class, validated
example rather than a hand-maintained snippet.

## Validation

The corpus is guarded in CI:

- Every fixture is **parsed and transformed**; a parse/transform error fails the
  build.
- Frontmatter is **schema-checked** — unknown keys and wrong types are rejected.
- `refrakt plugins validate` (and `plugin-validate`) report **role coverage** —
  e.g. "rune X has no `canonical` fixture".

Author fixtures with current rune syntax — a fixture that trips a rune's
attribute schema (an undeclared attribute, a bad enum value) fails validation,
so the corpus stays an accurate, runnable reference.

## A note on images

Fixtures must be deterministic and offline. For stand-in imagery, use the
[`placeholder:` / `icon:` image schemes](/runes/image-schemes) rather than
external URLs or `data:` URIs — they resolve to inline SVG with no network.

## See also

- [Plugin authoring](/extend/plugin-authoring/authoring) — where rune fixtures are declared.
- [Image schemes](/runes/image-schemes) — deterministic placeholder + icon imagery for fixtures.
