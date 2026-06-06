{% work id="WORK-355" status="draft" priority="medium" complexity="moderate" source="" tags="lumina,theme,tokens,tech-debt,dx" %}

# Generate theme scheme stylesheet from tokens.ts (retire hand-authored dark.css + tint.css palette copies)

The Lumina dark/scheme palette is hand-authored in **three** places that must be
kept in lockstep by hand:

1. `packages/lumina/tokens/dark.css` → `[data-theme="dark"]` (in-page theme toggle)
2. `packages/lumina/tokens/dark.css` → `@media (prefers-color-scheme: dark)` (system mode)
3. `packages/lumina/styles/runes/tint.css` → `[data-color-scheme="dark"]` and
   `[data-color-scheme="light"]` (the scoped scheme override used by preview /
   tint-mode / sandbox)

`packages/lumina/src/tokens.ts` is already the declared source of truth, and
`generateThemeStylesheet(luminaTokens)` (in `@refrakt-md/transform`) already
emits a stylesheet covering all the scheme selectors — but Lumina ships the
hand-authored copies instead, so the generator output and the shipped CSS can
diverge.

## Why now

This duplication has caused real bugs during the v0.19 surface work:

- A dark-surface "de-brown" change updated copies #1 and #2 but missed #3, so a
  `preview` rune toggled to dark still showed the old brown surface while the
  system toggle was correct (fixed in `c04c4f1`).
- An earlier `code-bg` hue change also missed `tint.css` (#3's `code-bg` was
  still the original `#222220`, untouched across two passes).

Coverage tests now guard against value drift — `token-config-coverage.test.ts`
compares `base.css`/`dark.css` to the generator, and a follow-up test compares
`tint.css`'s `[data-color-scheme]` overrides to the canonical token CSS — but
**guards only catch drift after the fact; they don't remove the duplication or
the maintenance burden of editing three places.**

## Acceptance Criteria
- [ ] The dark/scheme palette is emitted from `tokens.ts` via `generateThemeStylesheet` (single source), covering `[data-theme="dark"]`, `@media (prefers-color-scheme: dark)`, and the scoped `[data-color-scheme="dark"]` / `[data-color-scheme="light"]` overrides.
- [ ] `tokens/dark.css`'s hand-authored palette is removed or replaced by generated output.
- [ ] `tint.css` no longer re-declares raw palette hexes; its tint-specific logic (the `--cs-*` cascade and `[data-tint]` rules) is preserved and sources the base scheme palette from the generated tokens.
- [ ] No visual change: the generated output is verified at parity with the current hand-authored CSS (snapshot/diff or the existing coverage tests adapted).
- [ ] The now-redundant hand-sync guard tests are removed or repointed at the generated pipeline.
- [ ] Light mode is covered by the same single-source mechanism.

## Approach
- Audit the delta between `generateThemeStylesheet(luminaTokens)` output and the
  three hand-authored blocks (selectors, token set, `--cs-*` aliases, the Shiki
  `--rf-syntax-token-*` extras, shadows). The existing coverage test already
  encodes most of the expected mapping.
- Decide the integration point: emit the generated stylesheet at build time into
  `packages/lumina` (replacing `tokens/dark.css` and the palette portion of
  `tint.css`), or import/inject it through the CSS barrel (`index.css`).
- Keep `tint.css`'s tint cascade (`--cs-*`, `[data-tint]`, the dark/light tint
  resolution) — only the raw scheme palette declarations move to generation.
- Verify parity (no visual diff) before deleting the hand-authored copies.

## References
- Bug origin + drift guard: commit `c04c4f1` (sync tint.css scheme override; add drift test).
- De-brown change that exposed the gap: commit `db53138`.
- Source of truth: `packages/lumina/src/tokens.ts`; generator: `generateThemeStylesheet` in `@refrakt-md/transform`.
- Hand-authored copies: `packages/lumina/tokens/dark.css`, `packages/lumina/styles/runes/tint.css`.
- Existing coverage: `packages/lumina/test/token-config-coverage.test.ts`.

{% /work %}
