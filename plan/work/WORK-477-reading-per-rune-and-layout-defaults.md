{% work id="WORK-477" status="ready" priority="medium" complexity="simple" source="SPEC-108" milestone="v0.26.0" tags="reading,prose,runes,layouts,config" %}

# Reading per-rune + layout/region defaults

Assign the per-rune and layout-region reading defaults so the right bodies read as prose/ui/fine
with zero author markup. Per {% ref "SPEC-108" /%} §4 + Work breakdown 2.

## Scope

- Set `defaultReading` on editorial-body runes → `prose` (`pullquote`, `lore`, `blockquote`,
  `textblock`); UI runes → `ui` (or omit, since `ui` is the fallback) (`card`, `nav`, `form`);
  captions → `fine`.
- Set the `content`-region `reading` default per layout: `blog-article` → `prose`; `docs` → omit
  (so it stays `ui`, or a docs-tuned register).
- Verify the cascade end-to-end: a `pullquote` reads `prose` in any context; a `card` in a
  `blog-article` stays `ui`; bare article paragraphs in `blog-article` read `prose`.

## Acceptance Criteria

- [ ] Assignment resolves from layout/region default → per-rune `defaultReading` → author override; a `blog-article` content region defaults to `prose` and a `docs` region does not.
- [ ] Editorial-body runes default to `prose`, UI runes to `ui`, captions to `fine`; a `card` inside a `blog-article` stays `ui` while the bare article body reads `prose`.

## Dependencies

- {% ref "WORK-476" /%} — needs `defaultReading`, the region default field, and the resolver.

## References

- Spec: {% ref "SPEC-108" /%} §4 (assignment is layout-aware). `packages/transform/src/layouts.ts` (`blog-article`, `docs`), per-rune configs.

{% /work %}
