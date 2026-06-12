{% spec id="SPEC-102" status="draft" tags="fixtures,examples,dx,ai,editor,tooling,docs" %}

# Standardised rune example fixtures

Every rune carries example content — a small Markdoc snippet showing the rune in use. That
content is quietly load-bearing: it feeds `refrakt inspect`, the block editor's
insert-example, the docs/reference builder, `plugin-validate`'s coverage check, and — once
{% ref "SPEC-094" /%} lands — the kitchen-sink gallery and its visual-regression harness.
It is also the obvious corpus for the AI content generator.

But that content lives in **four** places with no shared format:

- `RUNE_EXAMPLES` in `packages/runes/src/examples.ts` — a TS `Record<string,string>` (~38
  core runes); the editor reads it (`editor/src/server.ts`), the reference builder falls back
  to it.
- `packages/cli/src/lib/fixtures.ts` — the CLI's *own* `fixtures` map for `inspect`,
  overlapping `RUNE_EXAMPLES`.
- Plugin **inline** `fixture` strings on rune definitions (`plugin.runes[name].fixture`).
- Plugin **file** fixtures — `discoverPluginFixtures` already loads `<pkg>/fixtures/<rune>.md`
  (plain Markdoc, one file per rune, no frontmatter).

Four mechanisms, overlapping content, **zero annotations**, **one example per rune** (so a
rune's structural variants can't each get representative content), and the AI generator
(`ai/src/modes/write.ts`) ignores all of it and **hardcodes its own** example in the prompt.
This spec pins down one format and one source.

## Overview

A fixture becomes a **Markdoc `.md` file with annotating frontmatter**, building on the
`fixtures/<rune>.md` convention that already exists for plugins — extended to core runes,
enriched with frontmatter, and allowed to have **multiple scenarios per rune**. A build step
compiles the files into a generated manifest so runtime consumers (editor in the browser, CLI)
keep zero-IO access. `RUNE_EXAMPLES` and the CLI's `fixtures.ts` become **generated** from this
single source — the same source-of-truth-then-generate pattern {% ref "SPEC-094" /%} applied
to tokens.

## Design

### 1. The format — `.md` + frontmatter

A fixture is authored as the rune's actual Markdoc, with YAML frontmatter for metadata:

```markdown
---
rune: recipe
title: Weeknight pasta
description: A full recipe with timing, servings, and a difficulty badge.
role: canonical
attributes: { difficulty: medium, prepTime: "20 min", servings: "4" }
demonstrates: [metadata-bar, ingredients-list, numbered-steps]
notes: Keep ingredient lines terse; the steps carry the detail.
---

{% recipe %}
## Ingredients
- 400g spaghetti
...
{% /recipe %}
```

Authoring fixtures *as real Markdoc* is dogfooding: no TS string-escaping, full editor
support, and every fixture can be parsed/transformed as genuine content (a fixture that won't
render fails loudly). Frontmatter is the payoff — see §2.

### 2. Frontmatter fields

| Field | Purpose | Consumer |
|-------|---------|----------|
| `rune` | The rune this exercises (or inferred from filename) | all |
| `title` / `description` | What this example demonstrates | editor, docs, gallery captions |
| `role` | `canonical` \| `minimal` \| `rich` \| `edge-case` — see §3 | all (selection) |
| `attributes` | The modifier values this scenario sets | **gallery** (variant matrix), inspect |
| `demonstrates` | Concepts/features shown (tags) | docs, AI retrieval |
| `notes` | Authoring guidance — *why* this is good | AI few-shot, docs |

All optional except enough to identify the rune. The schema is validated (§7).

### 3. The coverage-vs-exemplar split (the crucial distinction)

A fixture does one of **two jobs**, and they pull apart:

- a **coverage** fixture exercises every slot/modifier so `inspect`/gallery/tests see the full
  structure — tends to be cluttered and unrealistic;
- an **exemplar** is natural, focused, *good* content for AI few-shot and docs.

A fixture that shows all the structure is not necessarily good content, and vice-versa. The
`role` field resolves this: a rune may ship several files (`recipe.canonical.md`,
`recipe.minimal.md`, `recipe.cover.md`), and each consumer selects by role — the gallery wants
`canonical`/structural coverage across `attributes`, the AI generator and docs want the
natural exemplar. **Do not force one file to be both.**

### 4. Multiple scenarios per rune

Filename convention `<rune>.md` (the single/canonical scenario) or `<rune>.<scenario>.md`
(named scenarios). This is what lets a rune's *structural* variants — e.g. a card with vs.
without cover media — each carry representative content, which attribute-flipping a single
fixture cannot achieve (a known limitation called out in {% ref "SPEC-094" /%} §4).

### 5. Single source → generated manifest

`fixtures/**.md` (per package: core in `packages/runes/fixtures/`, each plugin in its own
`fixtures/`) is the single source. A build step compiles them into a generated manifest so
that:

- `RUNE_EXAMPLES` (editor/reference) and the CLI's `fixtures.ts` are **generated**, not
  hand-authored — retiring the duplication. Drift is guarded by a test, exactly as
  {% ref "SPEC-094" /%}'s token generation guards `tokens/*.css`.
- Runtime consumers that can't do filesystem IO (the editor in the browser; bundled CLI) import
  the generated manifest, preserving today's zero-IO ergonomics.

`discoverPluginFixtures` is upgraded from "read `<rune>.md` body" to "parse frontmatter +
body, support multiple scenarios," staying backward compatible with existing bare `.md`
fixtures (no frontmatter → all fields default).

### 6. AI consumption — few-shot, not training

The goal is *teaching the generator to write good content*; the mechanism is **in-context
few-shot exemplars**, not fine-tuning (a few hundred examples won't move a frontier model, and
the `ai` package calls a provider API). `ai/src/modes/write.ts` today hardcodes an "Example
structure" in its prompt; it should instead draw the rune's `role: rich`/`canonical` fixtures
(with their `notes`) as few-shot examples. The annotations are precisely what make few-shot
effective. No training pipeline is in scope — just retrieval of the right exemplars into the
prompt.

### 7. Authoring & validation

- Every fixture must **parse and transform** without error (CI checks the whole corpus).
- Frontmatter is validated against the field schema (unknown keys / wrong types rejected),
  mirroring the token-contract validator pattern.
- `plugin-validate` is upgraded: instead of only warning "no fixture," it reports role coverage
  (e.g. "rune X has no `canonical` fixture") and validates frontmatter.

## Implications

- **Cross-cutting.** Touches `runes`, every plugin, `cli`, `editor`, `ai`, the reference/docs
  builder, and the {% ref "SPEC-094" /%} gallery — which is why it's a dedicated spec, not a
  rider on the gallery work.
- **Migration.** The existing TS stores (`RUNE_EXAMPLES`, `cli/lib/fixtures.ts`, inline plugin
  `fixture` strings) migrate into `fixtures/**.md`; the TS objects become generated. A one-time
  extraction script can seed the `.md` files from current content.
- **Sequencing vs. the gallery.** The gallery ({% ref "SPEC-094" /%} §4 / WORK-407) can ship on
  the *current* `packageFixtures ?? RUNE_EXAMPLES` resolution and adopt this format when it
  lands — the fixture-resolution is a thin seam. This spec need not block the gallery; it is its
  own later milestone.
- **Backward compatibility.** Bare `<rune>.md` fixtures (no frontmatter) remain valid, so
  existing plugin fixtures keep working through the migration.

## Acceptance Criteria

- [ ] A documented fixture format is defined: Markdoc `.md` + validated YAML frontmatter (`rune`, `title`, `description`, `role`, `attributes`, `demonstrates`, `notes`), with `<rune>.md` / `<rune>.<scenario>.md` filenames supporting multiple scenarios per rune.
- [ ] The `role` distinction (`canonical`/`minimal`/`rich`/`edge-case`) exists and consumers select by it; the coverage-vs-exemplar split is documented.
- [ ] `fixtures/**.md` is the single source; `RUNE_EXAMPLES` and the CLI `fixtures.ts` are generated from it with a drift-guard test; runtime consumers import the generated manifest (zero-IO preserved).
- [ ] `discoverPluginFixtures` parses frontmatter + multiple scenarios and stays backward-compatible with bare `.md` fixtures.
- [ ] Every fixture is validated to parse/transform, and its frontmatter is schema-checked, in CI; `plugin-validate` reports role coverage.
- [ ] The AI `write` mode draws `rich`/`canonical` fixtures (with `notes`) as few-shot exemplars instead of a hardcoded prompt example; no training pipeline is introduced.
- [ ] The existing TS stores are migrated into `.md` fixtures (seeded by a one-time extraction) with no loss of current examples.

## Work breakdown (provisional)

1. **Format + frontmatter schema** — define and document the fields, filenames, and the `role` semantics; a validator for the frontmatter.
2. **Loader + generated manifest** — upgrade `discoverPluginFixtures` (frontmatter + scenarios); build step compiling `fixtures/**.md` → generated `RUNE_EXAMPLES` / CLI `fixtures.ts`; drift-guard test.
3. **Migration** — extraction script seeding `.md` files from the current TS stores + inline plugin `fixture` strings; delete the hand-authored duplicates.
4. **Consumers** — point `inspect`, editor, reference/docs, and (when it lands) the gallery at the generated manifest + role selection.
5. **AI few-shot** — replace the hardcoded example in `ai/modes/write.ts` with fixture-derived exemplars.
6. **Validation** — corpus parse/transform check + `plugin-validate` role-coverage reporting in CI.
7. **Docs** — fixture-authoring guide under the plugin/theme authoring section.

## References

- Immediate consumer & sequencing: {% ref "SPEC-094" /%} §4 (kitchen-sink gallery) and its WORK-407.
- Existing file-fixture convention to evolve: `discoverPluginFixtures` in `packages/runes/src/plugins.ts` (`<pkg>/fixtures/<rune>.md`).
- Current stores to unify: `packages/runes/src/examples.ts` (`RUNE_EXAMPLES`), `packages/cli/src/lib/fixtures.ts`, plugin inline `fixture` fields.
- Consumers: `packages/cli/src/commands/inspect.ts`, `packages/editor/src/server.ts`, `packages/runes/src/reference.ts`, `packages/cli/src/commands/plugin-validate.ts`, `packages/ai/src/modes/write.ts`.
- Generation-from-source precedent: {% ref "SPEC-094" /%} / WORK-406 token-CSS generation + drift guard.

{% /spec %}
