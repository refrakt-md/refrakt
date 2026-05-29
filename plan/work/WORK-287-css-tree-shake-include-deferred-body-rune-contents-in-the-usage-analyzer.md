{% work id="WORK-287" status="ready" priority="medium" complexity="moderate" source="" tags="css, tree-shaking, collection, relationships, analyzer" %}

# CSS tree-shake: include deferred-body rune contents in the usage analyzer

The SvelteKit adapter's `buildStart` CSS tree-shaking pass calls `analyzeRuneUsage(site.pages)` to collect the set of `data-rune` values that appear on any page, then narrows the shipped CSS to those blocks. The analyzer walks the *pre-postProcess* renderable tree — so for runes that capture a deferred body and only materialize per-item content during postProcess (`collection`, `relationships`), the analyzer sees the *wrapper* rune but not the runes its body template produces.

Concrete symptom on the plan-site dogfood: every dashboard renders `collection` wrappers containing `card` body templates, and entity detail pages render `relationships` wrappers containing `card` body templates via the dispatcher partial. After build, the shipped CSS bundle (`build/_app/immutable/assets/0.*.css`) includes `rf-collection` and `rf-relationships` rules but **strips `rf-card`, `rf-card__eyebrow`, `rf-card__title`, `rf-card__footer`, `rf-card__link`** etc. The HTML markup is correct but the cards render unstyled in production. Same for any other block-element rune used inside a deferred body. Dev mode is unaffected (Vite serves the full bundle).

## Acceptance Criteria
- [ ] `analyzeRuneUsage` (or the layer above it in `packages/sveltekit/src/plugin.ts`) picks up `data-rune` values that appear inside deferred body source captured on `collection` / `relationships` / `expand` runes (and any future rune with `deferBody: true`).
- [ ] Production build of `plan-site` ships `.rf-card`, `.rf-card__*`, and `.rf-card--*` rules; entity detail pages and dashboard cards render with the same styles as dev mode.
- [ ] No regression in the existing tree-shake savings — only the actually-used per-item runes are pulled in, not the full theme.
- [ ] Same fix applies to expanded entity content reached through `{% expand %}` — the embedded body's runes (e.g. headings, fences, embedded `relationships` from the entity template chain) reach the analyzer.

## Approach

The deferred body is stored verbatim as the `content` attribute of a `meta` tag inside the rune wrapper, with `data-field` set to `collection-body` / `relationships-body` / `expand`-resolved subtree. The analyzer can: (a) detect those meta tags, (b) re-parse their `content` with `Markdoc.parse`, (c) walk the resulting AST for `tag` nodes, (d) recurse — body templates can themselves contain runes with deferred bodies.

Alternative: rather than re-parse in the analyzer, contribute the rune types to a side-channel during the rune's own transform (`tag.attributes['data-rune-uses']`?). Less re-work but couples the analyzer to a rune-side convention. Re-parsing is more local.

For `expand`-substituted content, the inlined subtree IS present in the final renderable; the gap is that the analyzer runs before postProcess. Either re-run the analyzer after postProcess (simpler) or have the analyzer also walk registered entities' `extract`-produced AST.

Either way: `computeUsedCssBlocks` is what consumes the result, and is the unchanged downstream sink.

## References
- `packages/content/src/analyze.ts` — current analyzer; walks `page.renderable` for `data-rune` attributes.
- `packages/sveltekit/src/plugin.ts` ~line 162-194 — `buildStart` CSS analysis call site.
- `packages/runes/src/tags/{collection,relationships,expand}.ts` — runes that defer body content.
- `packages/runes/src/deferred-body.ts` — capture mechanism; `data-field="<rune>-body"` meta tag pattern.

{% /work %}
