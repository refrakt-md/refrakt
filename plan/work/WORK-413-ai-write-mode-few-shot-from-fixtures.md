{% work id="WORK-413" status="done" priority="medium" complexity="moderate" source="SPEC-102" milestone="v0.22.0" tags="fixtures,ai" %}

# AI write mode draws fixtures as few-shot exemplars

`ai/src/modes/write.ts` hardcodes an "Example structure" in its prompt. Replace it with the
unified fixtures — drawing each rune's `rich`/`canonical` fixture (with its `notes`) as
in-context few-shot exemplars. No training pipeline; retrieval into the prompt only.

## Acceptance Criteria

- [x] The write mode selects fixtures by `role` (rich/canonical) and includes them (+ `notes`) as few-shot examples instead of the hardcoded prompt example.
- [x] No fine-tuning / training pipeline is introduced.

## Dependencies

- Requires {% ref "WORK-411" /%} (manifest) and {% ref "WORK-412" /%} (annotated corpus).

## References

- {% ref "SPEC-102" /%} · `packages/ai/src/modes/write.ts`.

## Resolution

Completed: 2026-06-13

Branch: `claude/work-413-ai-fixture-fewshot` (stacked on the WORK-414 fixture work).

### What was done
- Extended `packages/runes/scripts/generate-examples.mjs` to also emit `RUNE_FIXTURE_META` (`role` + `notes` per fixture, only when explicitly set) alongside `RUNE_EXAMPLES`, parsing frontmatter with `yaml`. Exported `RUNE_FIXTURE_META` + `RuneFixtureMeta` from `@refrakt-md/runes`. (Fixtures aren't shipped in the published package, so the curation metadata is baked into the bundle at build time — runtime fixture reading wouldn't work for consumers.)
- Rewrote `packages/ai/src/modes/write.ts`: new `exemplarSection()` selects fixtures whose frontmatter explicitly tags `role: canonical|rich`, renders each as a fenced Markdoc block prefixed by its `notes`, under a "## Example patterns" heading. The hardcoded fake-`hero` "Example structure" snippet is removed; the multi-file path keeps only the FILE-marker format skeleton and points at the exemplars. Exemplars appear in both single- and multi-file modes.
- Tests in `packages/ai/test/modes/write.test.ts` assert role-based selection (includes `section`/`card`, excludes bare `chart`), notes surfacing (badge), fenced-block rendering, and that the old `# Welcome` stub is gone.

### Selection decision
An **explicit** `role` is the opt-in signal — the parser leaves `role` undefined for bare fixtures, so only authored exemplars qualify. Today that's 11 curated core fixtures (annotate, badge, bar, card, deflist, drawer, gallery, juxtapose, progress, reveal, section); the set grows automatically as the corpus is annotated. This keeps the few-shot block lean and intentional rather than dumping all ~92 examples (the rune vocabulary already lists every rune's example via `describeRune`).

### Notes
- No training/fine-tuning — pure prompt-time retrieval (AC #2).
- 208 tests pass across ai + cli; the examples drift test covers the new generated export.

{% /work %}
