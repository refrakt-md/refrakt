{% work id="WORK-266" status="done" priority="low" complexity="simple" source="SPEC-070" tags="runes, cards, collection" milestone="v0.16.0" %}

# card rune (generic content card)

The single core content-card rune (named `card`, **not** per-entity `*-card`), no `$item`/registry knowledge. The body splits on `---` into `[media] / body / [footer]`; the media zone holds any content (image, codegroup, sandbox); `href` makes the whole card a link. Reuses the shared split layout (media beside body on wide screens, full-bleed header on mobile). Usable standalone in prose or fed by a collection body template.

> **Revised after review** (see resolution): originally shipped as a self-closing, all-attributes `article-card`. Reworked to `card` — body-as-content + `[media]---body---footer` zones — to avoid setting a per-entity `*-card` precedent and to make the content authorable as markdown.

## Acceptance Criteria
- [ ] `{% card %}…{% /card %}` renders a self-contained card; body splits on `---` into `[media] / body / [footer]` (1 zone = body; 2 = media+body; 3 = media+body+footer)
- [ ] The media zone accepts arbitrary content (image, codegroup, …), not just an image; reuses the split layout via `data-section="media"` + `data-media-position="top"`
- [ ] `href` adds a stretched-link overlay (whole card clickable; nested links stay valid)
- [ ] Knows nothing about `$item`/registry; usable standalone and fed by a collection body template (`{% card href=$item.url %}### {% $item.data.title %}{% /card %}`)
- [ ] CSS in lumina (box chrome; split/grid from layouts/split.css); authoring docs show standalone + collection-fed usage

## Dependencies
- WORK-263 (collection core — the template context it's designed to be fed from)

## References

- {% ref "SPEC-070" /%} — cards as plain presentational runes

## Resolution

Completed: 2026-05-25

Branch: `claude/v0.16.0`

### What was done
- Initial cut (`article-card`, all-attributes) was reworked after a design review into a single generic `card` rune:
- `packages/runes/src/tags/card.ts`: content-model rune (`base: SplitLayoutModel`). Body captured as a sequence and split on `hr` into zones; positional by count (1 → body; 2 → media + body; 3 → media + body + footer; leading empty zone = no media). Media zone: unwraps a bare image, else renders arbitrary transformed content; emitted as `div[data-section="media"]`. Body+footer wrapped in `div[data-name="content"]` (so the split puts media | content). `href` → a stretched `a[data-name="link"]` overlay. Emits `buildLayoutMetas` for the layout meta.
- Catalog: renamed `article-card` → `card` `defineRune` (typeName `Card`). Engine config `Card: { block: 'card', rootAttributes: { 'data-media-position': 'top' }, modifiers: { layout: { source: 'meta', default: 'stacked' } } }` — the layout meta drives `data-layout`, and the shared `layouts/split.css` (data-attribute-keyed) provides the media|content grid + responsive collapse + mobile full-bleed media header. No bespoke grid CSS.
- `packages/lumina/styles/runes/card.css`: box chrome only (border/radius/surface), `__footer` (muted, border-top), stretched-link rules. Removed `article-card.css`.
- Tests: `packages/runes/test/card.test.ts` (6) — 1/2/3-zone roles, arbitrary (code) media, `href` stretched link, `$item`-fed body. Removed `article-card.test.ts`. Full runes suite (623) + CSS coverage (181) + contracts (Card) green.

### Notes
- Completes SPEC-070. One generic `card` (named by shape, not entity) — per-entity `*-card` runes are explicitly out of scope; designed cards in collections come from the body template + `card` + core runes, not from `recipe-card`/`character-card`.
- The `card` and `recipe` runes now share the same split-layout skeleton — `recipe` could later be re-expressed on top of `card` (future, not now).

{% /work %}
