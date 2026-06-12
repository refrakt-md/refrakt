{% work id="WORK-412" status="done" priority="high" complexity="complex" source="SPEC-102" milestone="v0.22.0" tags="fixtures,runes,content,gallery" %}

# Complete the standardised fixture corpus

With the format + loader in place ({% ref "WORK-411" /%}), author a good fixture for **every**
rune so the gallery, editor, and `inspect` render the whole catalogue correctly. The WORK-407
gallery surfaced ~25 runes with no real fixture (rendering the broken stub) and several child
runes shown standalone.

## Scope

- Author `canonical` fixtures for every rune that can render standalone but lacked one (`badge`, `bar`, `card`, `gallery`, `progress`, `drawer`, `juxtapose`, `section`, `annotate`, `reveal`, `deflist`, …). `badge` and other inline runes embed in prose (a standalone block paragraph inside an inline span is the `<p>`-in-`<span>` bug).
- **Gallery handling of non-standalone runes** — child runes that declare a specific `parent` (`budget-line-item`, `form-field`, `reveal-step`, …) are skipped; directive / registry / post-process runes that can't render outside the cross-page pipeline (`bg`, `tint`, `aggregate`, `collection`, `relationships`, `expand`, `file-ref`, `blog`, `snippet`) show an honest "no standalone preview" gap marker, never the broken stub.
- Dedupe byte-identical variant cells in the gallery so no-op variants don't add noise.

(Frontmatter *field* parsing/validation — `role` / `attributes` — and `<rune>.<scenario>.md` scenarios are consumed by {% ref "WORK-414" /%} (validation) and {% ref "WORK-413" /%} (AI few-shot); fixtures carry the frontmatter now, parsing lands there.)

## Acceptance Criteria

- [x] Every standalone-renderable rune has a `canonical` fixture that parses, transforms, and renders correctly (no `<p>`-in-inline-span breakage); inline runes embed in prose.
- [x] Child runes (specific `parent`) are skipped; directive/registry/post-process runes show an honest gap marker, never the broken stub.
- [x] The gallery deduplicates byte-identical variant cells.
- [x] A `refrakt gallery` run shows no stub artefacts and no identical-output variant noise across the catalogue.

## Dependencies

- Requires {% ref "WORK-411" /%} (format + loader). Validated against the {% ref "WORK-407" /%} gallery.

## References

- {% ref "SPEC-102" /%} · `packages/runes/fixtures/**.md` · `packages/cli/src/commands/gallery.ts`.

## Resolution

Completed: 2026-06-12

Branch: `claude/work-412-fixture-corpus`.

### What was done
**Gallery hygiene** (`packages/cli/src/commands/gallery.ts`):
- Skip child runes that declare a specific `parent` (e.g. `budget-line-item` → Budget); `parent: '*'` wrappers are not auto-skipped.
- Dedupe byte-identical variant cells per rune — removed the bulk of the "identical variants" noise.
- Runes with no real fixture render an honest **gap marker** (`hasFixture()` added to `cli/lib/fixtures.ts`), never the broken stub.

**Corpus** — authored 11 `canonical` fixtures (`packages/runes/fixtures/*.md`) for the standalone-renderable runes that lacked one: `badge`, `annotate`, `bar`, `card`, `deflist`, `drawer`, `gallery`, `juxtapose`, `progress`, `reveal`, `section`. Content adapted from the rune docs and verified via `inspect`. **`badge` is authored inline** (embedded in prose) — the standalone-block form was the root of the `<p>`-in-`<span>` bug, now fixed (0 occurrences).

### Impact
- Gallery: **51 → 46 runes** (5 child runes skipped), **239 → 139 cells** (dedup + skips), **0 `<p>`-in-`<span>`**, and only **9 gap markers** remain — all genuinely non-standalone-renderable: directive (`bg`, `tint`), registry/post-process (`aggregate`, `collection`, `relationships`, `expand`, `file-ref`, `blog`, `snippet`). These need the cross-page pipeline + registry, which the gallery's per-page render doesn't run.
- 790 runes+gallery tests green (incl. the examples drift test, which now regenerates from the larger corpus).

### Scope / notes
- Frontmatter *field* parsing/validation (`role`/`attributes`) + `<rune>.<scenario>.md` scenarios were re-homed to {% ref "WORK-414" /%} (validation) and {% ref "WORK-413" /%} (AI), where the fields are consumed. Fixtures carry the frontmatter (`role: canonical`, `notes`) now; the block is stripped on load.
- The 9 gap-marker runes are a **gallery limitation**, not missing fixtures — the gallery renders the per-page identity transform, not the register/aggregate/post-process phases. A future "registry-fed gallery" (or a documented skip-list) could cover them; out of scope here.

{% /work %}
