{% work id="WORK-406" status="pending" priority="medium" complexity="moderate" source="SPEC-094" milestone="v0.22.0" tags="theme,tokens,build,lumina" %}

# Generate Lumina token CSS from tokens.ts

Make `tokens.ts` the single source for Lumina's token CSS. Today `tokens/base.css` and
`tokens/dark.css` are hand-authored mirrors of `luminaTokens`, kept in lockstep by
`token-config-coverage.test.ts` — the file header even notes "a future build script that
regenerates this file." Wire `generateThemeStylesheet` into the build so the mirror and its
coverage test retire and drift becomes impossible.

## Acceptance Criteria

- [ ] `tokens/base.css` and `tokens/dark.css` are generated from `tokens.ts` via `generateThemeStylesheet` as a build step (committed artifact or build-time emit — decide in implementation).
- [ ] The hand-maintained mirror is removed and `token-config-coverage.test.ts` is retired or replaced by the generation guarantee.
- [ ] Generated output is byte-stable and matches the current tokens (including the typography tokens from {% ref "WORK-404" /%}).
- [ ] Theme-authoring docs updated: contributors edit `tokens.ts`, not the CSS mirror.

## Dependencies

- Sequenced after {% ref "WORK-404" /%}, and practically after {% ref "WORK-405" /%} (since `tokens.ts` changes there).

## References

- {% ref "SPEC-094" /%} · `generateThemeStylesheet` in `@refrakt-md/transform` · `packages/lumina/tokens/*.css` · `packages/lumina/test/token-config-coverage.test.ts`.

{% /work %}
