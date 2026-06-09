{% work id="WORK-376" status="done" priority="low" complexity="simple" source="SPEC-089" tags="surfaces, runes, lumina, docs" milestone="v0.20.0" %}

# Card intrinsic height/aspect knob for bg-only cards + card docs

Add a card intrinsic height/aspect knob for bg-only cards and document cover mode in the card reference.

## Acceptance Criteria
- [x] A card intrinsic-height knob (named-scale `height` + `aspect`) preserves height for `bg`-only cards (out-of-flow `bg`), documented as the standalone analog of bento row-spans.
- [x] The `card` reference documents `cover` mode, `content-place`, the cover scrim default, and card height, cross-linked with SPEC-087/088/086.

## Approach
SPEC-089 §4 + Docs.

## References

- {% ref "SPEC-089" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-089-cover-layout`

### What was done
- `packages/runes/src/config.ts` (Card) — `height` (named scale) + `aspect` modifiers; `styles.aspect: 'aspect-ratio'` emits the inline ratio.
- `packages/runes/src/tags/card.ts` — declares `height` (matches `sm|md|lg|xl`) and `aspect` attributes and emits them as metas.
- `packages/lumina/styles/runes/card.css` — `.rf-card[data-height="sm|md|lg|xl"]` min-height scale; the standalone analog of a bento row-span for a cover / `bg`-only card with no intrinsic content height.
- `site/content/runes/card.md` — new "Cover mode" section documenting `media-position="cover"`, `content-place` (incl. orientation-adaptive `auto`), the default cover scrim, and `height`/`aspect`; layout-attributes table and output contract updated; cross-linked to surfaces (SPEC-086), bg/scrim (SPEC-088), and substrate/routing (SPEC-087).

### Notes
- `height`/`aspect` lose to an external grid track (bento cell / collection row) and win otherwise — documented in the reference.

{% /work %}
