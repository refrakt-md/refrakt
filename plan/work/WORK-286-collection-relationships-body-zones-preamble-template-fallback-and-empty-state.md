{% work id="WORK-286" status="ready" priority="medium" complexity="moderate" source="SPEC-072" tags="collection,relationships,runes,lumina" milestone="v0.16.0" %}

# Collection/relationships body zones (preamble/template/fallback) and empty state

Give `collection` and `relationships` a build-time empty state and a way to hide a whole section when a query is empty. The body splits on top-level `hr` into **preamble / template / fallback** zones (card-style), and the self-closing no-body form takes a string `empty=`. The preamble — a heading/intro that renders only when there are results — is what lets the section heading live inside the rune so the whole thing appears or vanishes together (which `{% if %}` can't do, since emptiness is resolved at build time).

## Acceptance Criteria
- [ ] The body splits on **top-level `hr`** into zones: 1 → template (unchanged); 2 → `preamble --- template`; 3 → `preamble --- template --- fallback`. A leading empty zone skips the preamble.
- [ ] A `---` inside a nested `{% card %}`/`{% recipe %}` (etc.) is **not** a zone delimiter (top-level only).
- [ ] **Preamble** renders once, above items, only when the result set is non-empty; transformed plainly (no `$item`/`$kind`).
- [ ] **Fallback** renders once, in place of items, only when the result set is empty; transformed plainly.
- [ ] The **template** zone behaves exactly as today (per-item/per-edge deferred template; empty template → built-in items).
- [ ] Self-closing / no-body form supports a string `empty=` fallback; absent → render nothing (today's behavior preserved).
- [ ] Output adds `.rf-collection__preamble` / `.rf-collection__empty` (and `.rf-relationships__preamble` / `__empty`); Lumina CSS + coverage updated.
- [ ] `table` layout composes: zones split first, then the template zone is heading-column-split as today.
- [ ] Applies to both `collection` and `relationships`; tests cover preamble-hidden-when-empty, fallback-shown-when-empty, single-zone back-compat, nested-rune `---` safety, and the `empty=` attribute.

## Approach
In the shared body handling (collection-helpers / collection-resolve / relationships-resolve), split the captured `bodySource` AST on top-level `hr` into ≤3 zones before the per-item reparse. Render preamble/fallback once via plain `renderItemTemplate` (no item/kind vars); keep the template zone on the existing deferBody path. Add the `empty` attribute to both rune schemas (used when there's no body). Emit the new `__preamble`/`__empty` elements; lift styling into Lumina. Reuses the same top-level-hr splitting approach as `card` and the existing `splitColumns`.

## Dependencies
WORK-274 (shared helpers), WORK-278 (relationships rune). Pairs with WORK-280/281 (the plan-site entity/dashboard templates that use preambles).

## References
- {% ref "SPEC-072" /%} — Capability 5 (body zones + empty state).

{% /work %}
