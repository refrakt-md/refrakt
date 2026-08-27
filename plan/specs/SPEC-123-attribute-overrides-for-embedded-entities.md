{% spec id="SPEC-123" status="draft" tags="expand,embedding,attributes,overrides,runes,dx" %}

# Attribute overrides for embedded entities

`{% expand %}` embeds an entity by reading its **source** file and re-transforming
its content ({% ref "SPEC-066" /%}). The embedded rune therefore renders with the
attributes it carries *at its source location* — the contributing page has no say.
But a page that pulls an entity into a new context often wants attributes the
source never set: a route that features an embedded recipe wants
`media-position="left"` or `featured=true` for *its* presentation, without editing
the recipe's home file (which other pages also embed).

This spec lets an `{% expand %}` **override attributes on the embedded entity's
root rune**, using the object-valued bag and the build-strict validation posture
fixed by {% ref "ADR-027" /%}.

## Problem evidence

- **Embedded attributes come only from source.** `resolveOnePlaceholder`
  (`packages/runes/src/expand-pipeline.ts`) reads the entity's source AST (via
  `extract()`/`embed()`) and calls `Markdoc.transform(processed, embedConfig)`. The
  root rune's attributes are whatever the source authored; the contribution site
  contributes nothing.
- **Expand's attribute set is closed, so extras error.** `expand` declares a fixed
  set (`primary`/id, `type`, `level`, `canonical`, `label`). Markdoc `validate`
  emits `attribute-undefined` for anything else, surfaced as a diagnostic by the
  language server (`packages/language-server/src/providers/diagnostics.ts`). A bare
  `media-position="left"` on an expand would light up as an error.
- **`type` collides.** Expand already uses `type` as an entity-type hint
  (`data-expand-type`). A flat override named `type` — common on embedded runes —
  would be ambiguous. This is a core reason the override is a bag, not flat
  attributes ({% ref "ADR-027" /%} §Context).

## Design

### 1. `attributes={...}` on `expand`

`{% expand %}` accepts an `attributes` object bag ({% ref "ADR-027" /%} §1):

```
{% expand primary="RECIPE-012" attributes={media-position: "left", featured: true} /%}
```

The bag is applied to the **root rune of the extracted subtree** before the nested
`Markdoc.transform` in `resolveOnePlaceholder`, so the embedded rune transforms as
if the contribution site had authored those attributes. Expand's own attributes
(`primary`/`type`/`level`/`canonical`/`label`) stay top-level and strictly
validated; only the bag is open.

Parsing is confirmed against the pinned `@markdoc/markdoc@0.4.0`: bare hyphenated
keys (`media-position`) need no quoting and values keep their types
({% ref "ADR-027" /%} §Context).

### 2. Precedence

For the embed case the order is **bag override → embedded entity's own authored
attribute → root rune schema default** ({% ref "ADR-027" /%} §2). The bag is an
explicit act at the contribution site, so it sits *above* the source's authored
attributes — unlike {% ref "SPEC-122" /%}'s config defaults, which sit *below*
inline authoring. Both use the same merge helper; the difference is only which
layer the bag occupies.

### 3. Scope of the override

The bag targets the **root rune** of the embedded entity only — it re-skins the
embedded block as a whole. It is not a deep/selective override of nested child
runes; that is out of scope (see Non-goals). The resolver identifies the root rune
of the extracted subtree and merges the bag onto its attributes.

### 4. Validation — LSP-quiet, build-strict

The language server cannot validate or complete inside the bag: `getTagContext`
only understands `name="value"` positions, and the target rune is unknown until
`primary`/`id` resolves against the build-time registry ({% ref "ADR-027" /%} §3).
So the editor stays silent — but the **build does not**. At resolution time the
registry is available, so the resolver validates the bag against the resolved
entity's **root rune schema** using the shared bag validator, and errors (through
the existing `ctx.error` channel that expand already uses for missing entities /
cycles) on an unknown key, bad enum value, or wrong type. This catches the typo the
parser accepts: `mediaPosition: "left"` parses as a valid object key but is not a
real attribute — only schema validation flags it.

### 5. Config-driven expand defaults — deferred

A config form ("every expand on `contributed/**` gets `attributes={...}`") would
reuse {% ref "SPEC-122" /%}'s `runeDefaults` machinery against the *embedded* rune.
It is a natural extension but **not** in this spec: the tag-level override is the
90% case, it is explicit and auditable on the page (no spooky action), and it
proves the bag+validator end-to-end. The config form can layer on afterward without
rework, since both consume the same bag.

## Non-goals

- **No in-editor completion/validation for the bag.** Unavoidable — the target
  rune resolves at build time ({% ref "ADR-027" /%} §3). Build-time validation is
  the safety net.
- **No deep/selective child-rune overrides.** The bag re-skins the embedded root
  rune only, not arbitrary descendants.
- **No config-level expand defaults in v1** (§5) — deferred, reuses
  {% ref "SPEC-122" /%}.
- **`attributes` is not added to ordinary runes.** It is an `expand` affordance for
  embedding; ordinary runes set attributes inline ({% ref "ADR-027" /%} §Scope).

## Acceptance Criteria

- [ ] `{% expand %}` accepts an `attributes` object bag; its keys/values are applied to the embedded entity's root rune before the nested transform in `resolveOnePlaceholder`.
- [ ] Expand's own attributes (`primary`/`type`/`level`/`canonical`/`label`) remain strictly validated; a `type` inside the bag is unambiguously an override and does not collide with expand's entity-type hint.
- [ ] Effective value order is bag override → embedded entity's authored attribute → root rune schema default, via the shared precedence-merge helper ({% ref "ADR-027" /%} §2).
- [ ] At resolution the bag is validated against the resolved entity's root rune schema; an unknown key, bad enum value, or wrong-typed value produces a build error via `ctx.error` (e.g. `mediaPosition` is rejected).
- [ ] The language server does not emit `attribute-undefined` for `attributes={...}` on `expand` (the tag's schema admits the bag), and offers no completion inside it — validation is build-time only.
- [ ] A parse test pins that `attributes={media-position: "left", featured: true}` parses with bare hyphenated keys and typed values on the pinned Markdoc version.
- [ ] Expand/embedding docs cover attribute overrides, precedence vs source attributes, and the build-strict/editor-quiet posture.

## References

- Resolution + re-transform site: `resolveOnePlaceholder` /
  `Markdoc.transform(processed, embedConfig)` in
  `packages/runes/src/expand-pipeline.ts`.
- Expand rune spec: {% ref "SPEC-066" /%}.
- Representation, precedence, validation posture, `type`-collision rationale:
  {% ref "ADR-027" /%}.
- Shared bag + validator + `runeDefaults` sibling: {% ref "SPEC-122" /%}.
- Diagnostic surface that must admit the bag:
  `packages/language-server/src/providers/diagnostics.ts`.

{% /spec %}
