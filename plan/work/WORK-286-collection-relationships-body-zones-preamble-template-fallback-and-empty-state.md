{% work id="WORK-286" status="done" priority="medium" complexity="moderate" source="SPEC-072" tags="collection,relationships,runes,lumina" milestone="v0.16.0" %}

# Collection/relationships body zones (preamble/template/fallback) and empty state

Give `collection` and `relationships` a build-time empty state and a way to hide a whole section when a query is empty. The body splits on top-level `hr` into **preamble / template / fallback** zones (card-style), and the self-closing no-body form takes a string `empty=`. The preamble — a heading/intro that renders only when there are results — is what lets the section heading live inside the rune so the whole thing appears or vanishes together (which `{% if %}` can't do, since emptiness is resolved at build time).

## Acceptance Criteria
- [x] The body splits on **top-level `hr`** into zones: 1 → template (unchanged); 2 → `preamble --- template`; 3 → `preamble --- template --- fallback`. A leading empty zone skips the preamble.
- [x] A `---` inside a nested `{% card %}`/`{% recipe %}` (etc.) is **not** a zone delimiter (top-level only).
- [x] **Preamble** renders once, above items, only when the result set is non-empty; transformed plainly (no `$item`/`$kind`).
- [x] **Fallback** renders once, in place of items, only when the result set is empty; transformed plainly.
- [x] The **template** zone behaves exactly as today (per-item/per-edge deferred template; empty template → built-in items).
- [x] Self-closing / no-body form supports a string `empty=` fallback; absent → render nothing (today's behavior preserved).
- [x] Output adds `.rf-collection__preamble` / `.rf-collection__empty` (and `.rf-relationships__preamble` / `__empty`); Lumina CSS + coverage updated.
- [x] `table` layout composes: zones split first, then the template zone is heading-column-split as today.
- [x] Applies to both `collection` and `relationships`; tests cover preamble-hidden-when-empty, fallback-shown-when-empty, single-zone back-compat, nested-rune `---` safety, and the `empty=` attribute.

## Approach
In the shared body handling (collection-helpers / collection-resolve / relationships-resolve), split the captured `bodySource` AST on top-level `hr` into ≤3 zones before the per-item reparse. Render preamble/fallback once via plain `renderItemTemplate` (no item/kind vars); keep the template zone on the existing deferBody path. Add the `empty` attribute to both rune schemas (used when there's no body). Emit the new `__preamble`/`__empty` elements; lift styling into Lumina. Reuses the same top-level-hr splitting approach as `card` and the existing `splitColumns`.

## Dependencies
WORK-274 (shared helpers), WORK-278 (relationships rune). Pairs with WORK-280/281 (the plan-site entity/dashboard templates that use preambles).

## References
- {% ref "SPEC-072" /%} — Capability 5 (body zones + empty state).

## Resolution

Completed: 2026-05-26

Branch: `claude/v0.16.0`

### What was done
- `packages/runes/src/collection-helpers.ts` — `splitBodyZones(bodySource)` splits the captured body on **top-level `hr`** into `{ preamble?, template, fallback? }` (1→template; 2→preamble+template; 3→preamble+template+fallback; empty leading zone skips preamble; nested-tag `---` is a child, never a delimiter). Reuses `Markdoc.parse`/`format`.
- `collection-resolve.ts` / `relationships-resolve.ts` — `resolveOne` now: splits zones; on empty results renders a fallback zone, else the `empty=` attribute, else nothing (no preamble/items); on non-empty renders the preamble once above items (plain transform, no `$item`/`$kind`) and uses the **template** zone for per-item/per-edge rendering (table column-split composes on the template zone).
- `collection.ts` / `relationships.ts` schemas — added the `empty` attribute (emitted as `collection-empty`/`relationships-empty` metas; read in each resolver's query).
- Lumina `collection.css` / `relationships.css` — `__preamble` (first-child margin reset) + `__empty` (muted). CSS coverage unchanged (104/111).
- Tests: `collection-zones.test.ts` (empty attr, 3-zone preamble+items, 3-zone fallback-when-empty, single-zone back-compat, nested-card `---` safety) and a relationships `empty=` case.

### Notes
- Classes are set directly by the resolvers (postProcess runs after the identity transform), matching how `__items`/`__group` already work — no engine/config change, so no contracts regen.
- Markdoc parses a string *starting* with `---` as frontmatter, so the "skip preamble" empty-leading-zone form is documented but the tests exercise the 3-zone explicit form; authors use a leading blank line before `---` if needed.

{% /work %}
