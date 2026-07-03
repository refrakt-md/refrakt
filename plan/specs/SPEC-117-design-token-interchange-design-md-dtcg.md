{% spec id="SPEC-117" status="draft" tags="design, tokens, cli, interop, plugins" %}

# Design Token Interchange (DESIGN.md + DTCG)

Give the `@refrakt-md/design` plugin the ability to convert design systems to and from portable, industry-standard formats — leading with Google Labs' **DESIGN.md** and designing the seam so W3C **DTCG** token JSON is a first-class sibling. Built around a canonical internal model with pluggable format adapters, exposed through a new `refrakt design` CLI namespace (and, for free, the MCP surface).

---

## Overview

Refrakt already models design systems: the design plugin's `palette`, `typography`, and `spacing` runes are harvested by `design-context` into a `DesignTokens` object (`packages/types/src/tokens.ts`) that is injected into `sandbox` runes as CSS variables + a Tailwind config. But that token set is a **transient byproduct** — it lives only in a `<meta>` tag and the in-memory registry. It cannot be imported from, or exported to, any external tool or agent.

Two external conventions now matter, and they serve **different consumers**:

- **DESIGN.md** (Google Labs, Apache-2.0, `version: alpha`) — a repo-root Markdown file with YAML front-matter tokens + prose rationale, read natively by coding agents (Claude Code, Cursor, Stitch). Best fit for refrakt's markdown-native, prose-plus-tokens ethos. Momentum via Google Stitch and early enterprise adopters (e.g. Atlassian).
- **W3C DTCG Design Tokens Format Module** (stable `2025.10`) — the *interoperability* standard: JSON (`.tokens.json`, `$value`/`$type`, aliasing, theming, modern color spaces), supported by Figma, Penpot, Sketch, Tokens Studio, Style Dictionary v4, Terrazzo. This is the tool-to-tool exchange format.

These are complementary, not competing. DESIGN.md is design-context *for agents*; DTCG is tokens *for tooling*. Refrakt's opportunity is to be the layer that **renders either as living, browsable design-system documentation**, and **emits either from** a `design-context` — making a refrakt-authored design system both agent-consumable and tool-interoperable.

This spec defines the conversion architecture and scopes the DESIGN.md adapter as the first implementation, with DTCG designed in as a planned sibling (see WORK breakdown).

---

## Goals

- A **canonical token model** inside the design plugin that both external formats map onto — our `DesignTokens`, enriched where round-tripping demands it.
- A **format-adapter interface** (`parse` external → canonical; `emit` canonical → external) so adding a format is an adapter pair, not a rewrite.
- A **DESIGN.md adapter** (parse + emit) as the first concrete implementation.
- A **`refrakt design convert` CLI command** (new `design` cli-plugin namespace) that converts between a DESIGN.md file and refrakt design-runes markdown, in both directions. Exposed as an MCP tool automatically via CLI-command discovery.
- An **import rendering path**: turn an external design system into a `design-context` page with `palette`/`typography`/`spacing` children that renders as live docs.
- An **export path**: serialize a `design-context`'s canonical tokens to an external file, with an explicit, documented lossiness policy.
- DTCG **designed-in**: the adapter interface, canonical model, and CLI `--format` flag must accommodate a DTCG adapter with no interface changes. The adapter itself is a follow-up WORK item.

## Non-Goals

- Full schema parity with every DESIGN.md / DTCG feature in the first pass. Component tokens and theming modes are explicitly deferred (tracked as follow-up WORK).
- Forcing refrakt content pages into DESIGN.md's fixed `##` section grammar. Our rendered docs stay authored as normal content; the *converter* bridges, the *authoring model* does not change.
- A live/bidirectional sync daemon. Conversion is an explicit, invoked operation (CLI/MCP), not a watcher.
- Replacing the existing sandbox token-injection pipeline. This spec adds import/export around the existing canonical model; it does not change how tokens reach sandboxes.

---

## Background — three token shapes compared

| Concern | refrakt `DesignTokens` (today) | DESIGN.md | W3C DTCG |
|---|---|---|---|
| Carrier | `<meta>` JSON + registry | `.md` (YAML front matter + prose) | `.tokens.json` |
| Colors | `{ name, value, group? }[]` | `colors: { name: <CSS color> }` | `{ $type: "color", $value }` + aliases |
| Typography | `{ role, family, weights[], category }[]`; **size scale hardcoded** (`SIZES`) | `typography: { name: { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, fontFeature, fontVariation } }` | `{ $type: "typography", $value: {…} }` composite |
| Spacing | `{ unit?, scale?[] }` | `spacing: { <level>: <dim> }` | `{ $type: "dimension", $value }` |
| Radii / shadows | `{ name, value }[]` | `rounded: { <level>: <dim> }` (no shadow section) | `dimension` / `shadow` types |
| References / aliasing | none (flat primitives) | `{colors.primary}`, components only | `{group.token}` everywhere |
| Component tokens | none | `components: { name: { backgroundColor, textColor, typography, rounded, … } }` | via `$type` groups |
| Semantic roles | free-text `name` | token name is the role | naming convention + `$type` |
| Prose / rationale | none | first-class markdown body | none (`$description` per token) |
| Contrast / a11y | **computed (WCAG AA/AAA)** — a refrakt strength | not modelled | not modelled |

**Takeaways that drive the design:**

1. Our model is *richer* in a11y (computed contrast) and *poorer* in typography metrics and references. Closing the typography and aliasing gaps benefits our own sandbox injection regardless of interop, so it is worth doing.
2. DESIGN.md maps cleanly onto our model except for per-level typography metrics, component tokens, and `{…}` references.
3. DTCG needs `$type`/`$value` framing and aliasing — accommodated by the same canonical model once references exist. This is why DTCG is "designed-in," not "bolted-on later."

---

## Architecture

### 1. Canonical model (the hub)

Extend the existing `DesignTokens` (in `packages/types/src/tokens.ts`) to the superset both formats need. Enrichments:

- **Typography per-level metrics** — replace the hardcoded `SIZES` assumption with optional `fontSize`, `lineHeight`, `letterSpacing`, `fontWeight`, `fontFeature`, `fontVariation` per entry. Existing fields (`role`, `family`, `weights`, `category`) stay for backward compatibility; new fields are optional so current `typography` rune output remains valid.
- **Token references / aliasing** — a canonical reference representation (e.g. `{ $ref: "colors.primary" }` or a tagged string) so both DESIGN.md `{colors.primary}` and DTCG `{group.token}` resolve to one internal shape.
- **Component tokens** (deferred, but reserve the field) — an optional `components` map so the model can carry them once implemented, without another type change.
- **Provenance/metadata** — optional `name`, `description`, `version` carried through for round-trips (DESIGN.md front matter + DTCG group metadata).

The enriched model stays backward compatible: every field added is optional; `extractPaletteTokens` / `extractTypographyTokens` / `extractSpacingTokens` (in `plugins/design/src/tags/*`) continue to populate the subset they know.

### 2. Format-adapter interface

A pair of pure functions per format, colocated in the design plugin (e.g. `plugins/design/src/interchange/`):

```ts
interface TokenFormatAdapter {
  id: 'design-md' | 'dtcg';           // extensible
  /** Parse an external document into the canonical model. */
  parse(source: string): { tokens: DesignTokens; prose?: ProseSections; diagnostics: Diagnostic[] };
  /** Emit the canonical model as an external document. */
  emit(tokens: DesignTokens, prose?: ProseSections): { source: string; diagnostics: Diagnostic[] };
}
```

- `parse`/`emit` are side-effect-free and independently testable (golden-file fixtures per format).
- `diagnostics` surface lossy conversions (a DTCG feature DESIGN.md can't express, a DESIGN.md component token we don't yet model) rather than silently dropping data — see Lossiness Policy.
- `ProseSections` carries DESIGN.md's markdown body (Overview, Colors, Typography, …) so import can seed rune blurbs and export can reconstruct rationale. DTCG's adapter leaves it empty.

### 3. CLI surface — new `design` cli-plugin namespace

The design plugin gains a `cli-plugin` export (it has none today), following the `plan` plugin's pattern (`plugins/plan/src/cli-plugin.ts`, discovered by `packages/cli/src/lib/plugins.ts`). Package `exports` gains `./cli-plugin`; `refrakt.config.json` / dependency scanning picks it up.

Proposed command:

```bash
# External → refrakt design-runes markdown (import / render as living docs)
refrakt design convert DESIGN.md --to refrakt -o site/content/design/system.md
refrakt design convert tokens.json --from dtcg --to refrakt -o …

# refrakt design-context → external (export)
refrakt design convert site/content/design/system.md --to design-md -o DESIGN.md
refrakt design convert … --to dtcg -o design.tokens.json

# Flags
#   --from <design-md|dtcg|refrakt>   source format (inferred from extension/content when omitted)
#   --to   <design-md|dtcg|refrakt>   target format (required)
#   --scope <name>                    which design-context scope to export (default: "default")
#   --strict                          fail (non-zero exit) on any lossy diagnostic
#   --format json                     machine-readable result + diagnostics
```

Because CLI commands are auto-registered as MCP tools by the discovery layer, `mcp__refrakt__design_convert` comes for free — no extra MCP binding work beyond the standard schema/handler the other plugins define.

### 4. Import rendering path

`--to refrakt` produces a `.md` page containing a `{% design-context %}` wrapping generated `{% palette %}`, `{% typography %}`, `{% spacing %}` runes reconstructed from the canonical model. Result: drop in a DESIGN.md, get a rendered, browsable design-system page (swatches, specimens, spacing bars) with WCAG badges computed by our existing palette logic. This is the headline demo.

### 5. Export path

`--to design-md` / `--to dtcg` walks the `design-context` token registry (reusing the pipeline's existing `extract*Tokens` harvesting) for the named `--scope`, runs the target adapter's `emit`, and writes the file. DESIGN.md export includes reconstructed prose sections seeded from rune blurbs; DTCG export is pure JSON.

---

## Lossiness Policy

Conversion between three models of differing expressiveness is inherently lossy in places. The rule:

- **Never drop data silently.** Every field that cannot be represented in the target produces a `diagnostic` (warning by default).
- `--strict` promotes any lossy diagnostic to a non-zero exit (for CI gating a DESIGN.md ↔ refrakt round-trip).
- Round-trip fidelity is a tested contract: `parse(emit(tokens))` must equal `tokens` for the subset both models express (golden fixtures). Fields outside the intersection are documented as lossy with a listed reason.
- Known lossy edges to document up front: refrakt's computed WCAG contrast (not representable in either target — recomputed on import, dropped on export), DESIGN.md component tokens (deferred → diagnostic until implemented), DTCG theming modes (deferred → diagnostic).

---

## Acceptance Criteria

- The canonical `DesignTokens` model is extended with optional per-level typography metrics, a token-reference representation, and reserved `components`/metadata fields, with all existing rune output still valid (no breaking changes to current `extract*Tokens` consumers or sandbox injection).
- A `TokenFormatAdapter` interface exists in the design plugin, with parse/emit as pure, independently tested functions and a `diagnostics` channel for lossy conversions.
- A DESIGN.md adapter implements both `parse` and `emit`, covering colors, typography (incl. per-level metrics), spacing, and rounded/radii, plus prose body sections.
- The design plugin exposes a `cli-plugin` export adding a `design` namespace with a `convert` command supporting `--from`/`--to`/`--scope`/`--strict`/`--format json`, discovered by the CLI and surfaced as an MCP tool.
- `refrakt design convert DESIGN.md --to refrakt` produces a valid design-runes `.md` page that renders a `design-context` with palette/typography/spacing (verified by rendering the output through the existing transform pipeline).
- `refrakt design convert <page> --to design-md` reproduces a DESIGN.md whose token front matter round-trips (`parse(emit(x))` equals `x` on the shared subset), verified by golden fixtures.
- A DESIGN.md ↔ refrakt round-trip test passes, and lossy edges are enumerated in adapter docs; `--strict` exits non-zero when a lossy diagnostic is raised.
- The DTCG adapter is **not required to be implemented**, but the interface, canonical model, and `--from/--to` flag accept `dtcg` with no signature changes — demonstrated by a stub adapter or a design note plus a follow-up WORK item.
- Documentation: a page under `site/content/extend/` (or the design plugin's docs) explains the converter, the format landscape (DESIGN.md vs DTCG vs refrakt), and the lossiness policy.

---

## Proposed Work Breakdown

1. **WORK — Canonical model enrichment**: extend `DesignTokens` (typography metrics, references, reserved component/metadata fields); keep `extract*Tokens` + sandbox injection green.
2. **WORK — Adapter interface + diagnostics + design cli-plugin scaffold**: `TokenFormatAdapter`, `ProseSections`, `Diagnostic`; add `./cli-plugin` export and `design convert` command wiring (dispatch only).
3. **WORK — DESIGN.md adapter (parse + emit)** with golden fixtures and round-trip test.
4. **WORK — Import rendering path**: canonical → `design-context` runes markdown generator + pipeline render verification.
5. **WORK — Export path + lossiness policy**: registry/scope walk → `emit`; `--strict` gating; documented lossy edges.
6. **WORK — Docs page** (converter usage + format landscape).
7. **WORK (follow-up, designed-in) — DTCG adapter (parse + emit)**: `$type`/`$value`, aliasing → canonical references; `.tokens.json` I/O.
8. **WORK (follow-up) — Component tokens & theming modes**: model + adapters for DESIGN.md `components` and DTCG theming.

---

## Open Questions

- **Reference representation.** Tagged string (`"{colors.primary}"`) vs. structured (`{ $ref }`). Structured is cleaner internally but needs (de)serialization at both rune and adapter boundaries. Lean structured internally, tagged at rune-authoring surface.
- **Prose fidelity on export.** How faithfully should DESIGN.md prose sections be reconstructed from rune blurbs — stub headings only, or best-effort content? Propose stub headings + blurb passthrough in v1.
- **Contrast on import.** Recompute WCAG from imported colors (consistent with authored palettes) vs. trust any values present. Propose recompute — it's our differentiator and avoids trusting external a11y claims.
- **DESIGN.md `version: alpha` churn.** Pin to a spec revision and gate on it, surfacing a diagnostic when an input declares an unknown `version`.
- **Naming.** `refrakt design convert` vs. split `import`/`export` subcommands. Single `convert` with `--from/--to` is more composable and fewer commands to register; revisit if UX feedback disagrees.

---

## References

- DESIGN.md — https://github.com/google-labs-code/design.md (spec: `docs/spec.md`)
- W3C DTCG Design Tokens Format Module (stable 2025.10) — https://www.designtokens.org/tr/drafts/format/
- Canonical token type — `packages/types/src/tokens.ts`
- Token harvesting + sandbox injection — `plugins/design/src/pipeline.ts`, `packages/behaviors/src/elements/sandbox.ts` (`buildDesignTokenTags`, `buildTailwindTokenConfig`)
- Design runes — `plugins/design/src/tags/{palette,typography,spacing,design-context}.ts`
- Plugin CLI mechanism — `plugins/plan/src/cli-plugin.ts`, `packages/cli/src/lib/plugins.ts` (`discoverPlugins`)

{% /spec %}
