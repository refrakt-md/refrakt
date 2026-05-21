{% work id="WORK-239" status="done" priority="high" complexity="simple" source="SPEC-058" tags="adapters, transform, tokens, refactor" milestone="v0.14.4" %}

# Extract composeSiteTokensCss into @refrakt-md/transform/node

Move the `composeSiteTokensCss(site, configDir)` helper out of `packages/sveltekit/src/plugin.ts` and into `@refrakt-md/transform/node` so the other framework adapters can call it. The function is already pure — config in, CSS string out, with one `loadPresets` dependency that already lives in `transform/node`. No behavioural change; just relocation + re-export.

This is the prerequisite for every adapter wiring item in the v0.14.4 milestone — they all consume the extracted function.

## Acceptance Criteria

- [x] `composeSiteTokensCss(site: SiteConfig, configDir: string): Promise<string>` is exported from `@refrakt-md/transform/node` (added to `packages/transform/src/adapter-node.ts`)
- [x] Implementation moved to a new `packages/transform/src/site-tokens.ts` (or appended to an existing `node`-only file) — the function body matches the current SvelteKit local copy line-for-line except for any module-path adjustments
- [x] `packages/sveltekit/src/plugin.ts` imports the function from `@refrakt-md/transform/node` and deletes the local copy (~70 lines removed from `plugin.ts`)
- [x] `npm run build` succeeds across the full workspace
- [x] `npm test` passes — existing SvelteKit plugin tests must continue to pass with byte-identical CSS output
- [x] The site builds clean from a clean checkout (`cd site && rm -rf .svelte-kit build && npm run build`) and the generated `virtual:refrakt/site-tokens.css` content matches the pre-extraction output (diff against `git stash` of the build artifact)

## Approach

The current implementation in `packages/sveltekit/src/plugin.ts:308–379` has zero SvelteKit-specific dependencies. It imports `mergeThemeTokensConfigs`, `generateThemeStylesheet`, `generateScopedTintStylesheet`, `validateThemeTokensConfig`, `formatTokenValidationErrors` from `@refrakt-md/transform`, and `loadPresets` from `@refrakt-md/transform/node`. All five are already exported.

**Move plan:**

1. Create `packages/transform/src/site-tokens.ts` with the moved function. Keep the JSDoc block — it documents the SPEC-048 + SPEC-056 contract.
2. Re-export from `packages/transform/src/adapter-node.ts` so it's part of `@refrakt-md/transform/node`'s public API.
3. Update `packages/sveltekit/src/plugin.ts`:
   - Remove the local function (lines 308–379)
   - Add `composeSiteTokensCss` to the import from `@refrakt-md/transform/node` at line 14
   - The call site at line 99 remains identical: `siteTokensCss = await composeSiteTokensCss(activeSite, activeConfigDir);`
4. Keep the module placement under the `node` export path — the function does filesystem I/O (`loadPresets` reads preset modules), so it must stay out of `@refrakt-md/transform`'s browser-safe surface.

**Why a new file rather than appending to `preset-loader.ts` or `token-stylesheet.ts`:**

`preset-loader.ts` is the lowest-level preset reader; adding a higher-level orchestrator there muddies its purpose. `token-stylesheet.ts` is browser-safe (no Node imports) and should stay that way. A new `site-tokens.ts` sibling under the `node` entrypoint keeps the layering clean.

## References

- {% ref "SPEC-058" /%} — adapter parity spec
- {% ref "SPEC-048" /%} — design tokens contract
- {% ref "SPEC-056" /%} — scoped tint projection (the second branch of the function)
- `packages/sveltekit/src/plugin.ts:308–379` — current implementation to extract
- `packages/transform/src/adapter-node.ts` — destination for the public re-export

## Resolution

Completed: 2026-05-21

Branch: `claude/update-adapters-5CJgQ`

### What was done

- Created `packages/transform/src/site-tokens.ts` with the `composeSiteTokensCss(site, configDir)` function lifted whole from the SvelteKit plugin. Function body, JSDoc, and behaviour unchanged.
- Added re-export to `packages/transform/src/adapter-node.ts` so it surfaces from the `@refrakt-md/transform/node` entrypoint alongside `loadPreset`/`loadPresets`/`normalizeRefraktConfig`/`resolveSite`.
- Removed the 90-line local copy from `packages/transform/sveltekit/src/plugin.ts` (lines 285–372 of the pre-extraction file). Imports tidied: dropped `mergeThemeTokensConfigs`, `generateThemeStylesheet`, `generateScopedTintStylesheet`, `validateThemeTokensConfig`, `formatTokenValidationErrors`, `loadPresets`, and the `ThemeTokensConfig` type — none used now that the function is gone. Added `composeSiteTokensCss` to the `@refrakt-md/transform/node` import.
- Full workspace `npm run build` succeeds.
- Vitest pass: 28 files / 439 tests, including all 21 SvelteKit plugin + virtual-modules tests.
- `cd site && rm -rf .svelte-kit build && npm run build` produces 173 pages clean. The Nord scoped-tint validation from WORK-221 still passes — `grep -o "data-tint=nord" site/build/_app/immutable/assets/0.*.css | wc -l` returns 3, matching the pre-extraction count.

### Notes

The function fit the existing `transform/node` entrypoint cleanly — no new export needed for the `Promise<string>` shape, and the `loadPresets` dependency was already in the same module. Site CSS bundle is byte-identical to the pre-extraction reference (only the function's call site moved, not its body).

{% /work %}
