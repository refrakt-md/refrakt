{% decision id="ADR-019" status="accepted" date="2026-06-11" source="SPEC-085" tags="bento,runes,layout,architecture,marketing,core" %}

# Bento belongs in core, not the marketing plugin

## Context

`bento` (and its child `bento-cell`) ships in `@refrakt-md/marketing`, but it is a
**generic grid primitive**, not a marketing device. It arranges arbitrary children
into a magazine grid where heading level drives cell size — the same structural
family as the core Layout runes `juxtapose`, `reveal`, `accordion`, `tabs`, and the
new `section` ({% ref "WORK-396" /%}).

Three things make the current home awkward:

- **Zero coupling.** `bento.ts` imports only from `@refrakt-md/runes` core
  (`createComponentRenderable`, `createContentModelSchema`, `RenderableNodeCursor`,
  `asNodes`, `unwrapParagraphImages`). No marketing-local code; no other marketing
  rune depends on it at runtime. Nothing tethers it to the plugin.
- **Broad use beyond marketing.** Dashboards, galleries, spec/doc overviews, and
  the plan site all want a bento grid without pulling in hero/cta/pricing.
- **An incoherent canonical composition.** The documented pattern `section`
  (core) wrapping `bento` (marketing-only) straddles the core/plugin boundary —
  the preamble primitive is universal but the grid it introduces is not.

This is orthogonal to {% ref "ADR-018" /%} (canonical layout *values*): that decides
how `layout` enum values are shared across runes; this decides where the `bento`
rune itself lives.

## Options Considered

1. **Leave bento in marketing** — no churn, but perpetuates the incoherence:
   projects without the marketing plugin can't use a generic grid, and the
   `section + bento` story spans two packages.
2. **Duplicate a core grid** — a second grid rune in core alongside marketing's
   bento. Rejected: two grids to learn, maintain, and keep visually consistent.
3. **Relocate bento + bento-cell to core** (chosen) — move the schema, engine
   config, CSS, types, tests, and docs to core; it becomes available in every
   project regardless of plugins, next to the other Layout primitives.

## Decision

Relocate `bento` and `bento-cell` to core (`@refrakt-md/runes` + `@refrakt-md/lumina`)
as **Layout** runes. Marketing keeps a thin **re-export shim** (`bento`/`bentoCell`
+ `BentoProps`/`BentoCellProps`) for one minor so existing
`import { bento } from '@refrakt-md/marketing'` callers don't break; the shim is
removed in a later major. The docs move to `/runes/bento` with a redirect from
`/runes/marketing/bento`.

## Rationale

The move is low-risk (no coupling to unwind) and high-coherence (bento joins the
runes it actually belongs with). Because core config is always loaded, every
existing marketing user keeps bento with no authoring change, and non-marketing
projects gain it. The re-export shim keeps the package break soft.

## Consequences

- `@refrakt-md/marketing`'s exported surface shrinks → a **minor** bump behind the
  shim now, a **major** when the shim is dropped.
- Theme overrides keyed `Bento` continue to apply via `mergeThemeConfig` (keyed by
  typeName, base location is irrelevant), so theme authors are largely unaffected.
- `contracts/structures.json` changes (bento moves catalogues); CSS coverage moves
  from marketing to lumina.
- Inbound doc links (`page-sections.md`, `marketing/index.md`, `media-guests.md`,
  `runes/section.md`) update to `/runes/bento`.
- Execution is deferred to {% ref "WORK-397" /%}; not a blocker for {% ref "WORK-350" /%}
  (bento works where it is today).

{% /decision %}
