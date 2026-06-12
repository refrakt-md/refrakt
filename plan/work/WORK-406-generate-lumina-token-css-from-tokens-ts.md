{% work id="WORK-406" status="done" priority="medium" complexity="moderate" source="SPEC-094" milestone="v0.22.0" tags="theme,tokens,build,lumina" %}

# Generate Lumina token CSS from tokens.ts

Make `tokens.ts` the single source for Lumina's token CSS. Today `tokens/base.css` and
`tokens/dark.css` are hand-authored mirrors of `luminaTokens`, kept in lockstep by
`token-config-coverage.test.ts` — the file header even notes "a future build script that
regenerates this file." Wire `generateThemeStylesheet` into the build so the mirror and its
coverage test retire and drift becomes impossible.

## Acceptance Criteria

- [x] `tokens/base.css` and `tokens/dark.css` are generated from `tokens.ts` via `generateThemeStylesheet` as a build step (committed artifact or build-time emit — decide in implementation).
- [x] The hand-maintained mirror is removed and `token-config-coverage.test.ts` is retired or replaced by the generation guarantee.
- [x] Generated output is byte-stable and matches the current tokens (including the typography tokens from {% ref "WORK-404" /%}).
- [x] Theme-authoring docs updated: contributors edit `tokens.ts`, not the CSS mirror.

## Dependencies

- Sequenced after {% ref "WORK-404" /%}, and practically after {% ref "WORK-405" /%} (since `tokens.ts` changes there).

## References

- {% ref "SPEC-094" /%} · `generateThemeStylesheet` in `@refrakt-md/transform` · `packages/lumina/tokens/*.css` · `packages/lumina/test/token-config-coverage.test.ts`.

## Resolution

Completed: 2026-06-12

Branch: `claude/work-406-generate-token-css`

### What was done
- **`packages/lumina/scripts/generate-tokens.mjs`** (new) — generates `tokens/base.css` + `tokens/dark.css` from `luminaTokens` via `generateThemeStylesheet`. The base block is the prefix of the full stylesheet, so the dark blocks are derived as `full.slice(base.length)`. The file-write is guarded behind an `isMain` check so the drift test can import `renderTokenCss` side-effect-free.
- **`package.json`** — `build` is now `tsc && node scripts/generate-tokens.mjs`; added a `generate-tokens` script. dist/tokens.js (from tsc) feeds the generator; `@refrakt-md/transform` is already built earlier in the monorepo order.
- **`tokens/base.css` + `tokens/dark.css`** — now generated, committed artifacts with a "do not edit" header. No tokens lost vs. the old hand-authored files; the only additions are the SPEC-056 derived Shiki aliases the generator emits (`--rf-syntax-token-{type,tag,number,operator,property,attribute,regex}`) and the broader `:root, [data-color-scheme="light"]` / combined dark selectors (the generator's intended forced-scheme handling). Values are identical, so rendering is unchanged.
- **`test/token-generation.test.ts`** (new, replaces `token-config-coverage.test.ts`) — the generation guarantee: asserts the committed CSS is byte-identical to `renderTokenCss()` output (drift fails CI). Ports the tint.css `[data-color-scheme]` sync check (updated for the combined dark selector).
- **`src/tokens.ts`** header + **`creating-a-theme.md`** — updated to state the CSS is generated; edit `tokens.ts`, never the CSS.

### Notes
- Kept the two-file layout (`base.css` + `dark.css`) rather than merging — only the two barrels (`index.css`, `base.css`) import them, and the split keeps tint.css's "keep in sync" references meaningful.
- Verified no token regressions (declaration-set diff old vs new = none lost), full Lumina suite green (276 tests incl. css-coverage 109/117 unchanged and contracts), build wiring confirmed (regenerates idempotently).

{% /work %}
