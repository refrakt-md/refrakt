{% work id="WORK-412" status="pending" priority="high" complexity="complex" source="SPEC-102" milestone="v0.22.0" tags="fixtures,runes,content,gallery" %}

# Complete the standardised fixture corpus

With the format + loader in place ({% ref "WORK-411" /%}), author a good fixture for **every**
rune so the gallery, editor, and `inspect` render the whole catalogue correctly. The WORK-407
gallery surfaced ~25 runes with no real fixture (rendering the broken stub) and several child
runes shown standalone.

## Scope

- Author `canonical`-role fixtures for the runes that lack one (the ~25 stub runes: `badge`, `bar`, `card`, `blog`, `gallery`, `progress`, `drawer`, `expand`, `collection`, `conversation`, `juxtapose`, `tint`, `section`, `aggregate`, `annotate`, `file-ref`, `relationships`, `reveal`, `bg`, …), with sensible `attributes` and `notes`.
- Add `attributes` annotations to existing fixtures so the gallery's variant matrix renders representative content (not just an added bare attribute).
- Where a rune's structural variants need distinct content (e.g. `card` with/without cover media), add named-scenario files.
- **Gallery handling of non-standalone runes** — child runes (`budget-category`, `budget-line-item`, `conversation-message`, `form-field`, `reveal-step`, `deflist`, …) are skipped or rendered only within their parent's fixture; runes still without a fixture render an explicit "no fixture" gap marker, never the broken stub.
- Dedupe byte-identical variant cells in the gallery so no-op variants don't add noise.

## Acceptance Criteria

- [ ] Every standalone rune in the catalogue has a `canonical` fixture that parses, transforms, and renders correctly (no `<p>`-in-inline-span style breakage).
- [ ] Existing fixtures carry `attributes` so their gallery variant cells show representative content.
- [ ] Child / non-standalone runes are not rendered as broken top-level cells; missing fixtures show a gap marker, not the stub.
- [ ] The gallery deduplicates byte-identical variant cells.
- [ ] A `refrakt gallery` run shows no stub artefacts and no identical-output variant noise across the catalogue.

## Dependencies

- Requires {% ref "WORK-411" /%} (format + loader). Validated against the {% ref "WORK-407" /%} gallery.

## References

- {% ref "SPEC-102" /%} · `packages/runes/fixtures/**.md` · `packages/cli/src/commands/gallery.ts`.

{% /work %}
