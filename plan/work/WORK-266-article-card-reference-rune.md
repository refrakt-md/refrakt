{% work id="WORK-266" status="done" priority="low" complexity="simple" source="SPEC-070" tags="runes, cards, collection" milestone="v0.16.0" %}

# article-card reference card rune

The first core plain-presentational card rune — ordinary attributes, no `$item`/registry knowledge — shipped as the reference implementation for collection body templates. Proves the "cards are plain runes; the template wires entity fields into attributes" model.

## Acceptance Criteria
- [ ] `{% article-card title= href= image= date= excerpt= /%}` renders a self-contained card from plain attributes
- [ ] Knows nothing about `$item`, the registry, or collection; usable standalone with hand-authored attributes
- [ ] Works inside a collection body template fed by `$item` fields (e.g. `{% article-card title=$item.data.title href=$item.url /%}`)
- [ ] CSS in lumina; `refrakt inspect article-card` shows expected HTML; authoring docs show standalone + collection-fed usage

## Dependencies
- WORK-263 (collection core — the template context it's designed to be fed from)

## References

- {% ref "SPEC-070" /%} — cards as plain presentational runes

## Resolution

Completed: 2026-05-25

Branch: `claude/v0.16.0`

### What was done
- `packages/runes/src/tags/article-card.ts`: self-closing rune rendering an `article[data-rune="article-card"]` from plain attributes (title, href, image, date, excerpt); named parts via `refs` → `rf-article-card__{image,title,date,excerpt}`. No `$item`/registry knowledge; title is a link when `href` is set, span otherwise; optional parts omitted when absent.
- Catalog `article-card` `defineRune` + `ArticleCard: { block: 'article-card' }` engine config + lumina CSS (+ index import).
- Tests: `packages/runes/test/article-card.test.ts` (3) — standalone, optional-part omission, and variable-fed (`title=$t href=$u`) usage. CSS coverage green (181).

### Notes
- Completes SPEC-070. Designed to be fed from a collection body template: `{% article-card title=$item.data.title href=$item.url /%}`.

{% /work %}
