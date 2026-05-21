{% work id="WORK-239" status="ready" priority="high" complexity="simple" source="SPEC-058" tags="adapters, transform, tokens, refactor" milestone="v0.14.4" %}

# Extract composeSiteTokensCss into @refrakt-md/transform/node

Move the `composeSiteTokensCss(site, configDir)` helper out of `packages/sveltekit/src/plugin.ts` and into `@refrakt-md/transform/node` so the other framework adapters can call it. The function is already pure — config in, CSS string out, with one `loadPresets` dependency that already lives in `transform/node`. No behavioural change; just relocation + re-export.

This is the prerequisite for every adapter wiring item in the v0.14.4 milestone — they all consume the extracted function.

## Acceptance Criteria

- [ ] `composeSiteTokensCss(site: SiteConfig, configDir: string): Promise<string>` is exported from `@refrakt-md/transform/node` (added to `packages/transform/src/adapter-node.ts`)
- [ ] Implementation moved to a new `packages/transform/src/site-tokens.ts` (or appended to an existing `node`-only file) — the function body matches the current SvelteKit local copy line-for-line except for any module-path adjustments
- [ ] `packages/sveltekit/src/plugin.ts` imports the function from `@refrakt-md/transform/node` and deletes the local copy (~70 lines removed from `plugin.ts`)
- [ ] `npm run build` succeeds across the full workspace
- [ ] `npm test` passes — existing SvelteKit plugin tests must continue to pass with byte-identical CSS output
- [ ] The site builds clean from a clean checkout (`cd site && rm -rf .svelte-kit build && npm run build`) and the generated `virtual:refrakt/site-tokens.css` content matches the pre-extraction output (diff against `git stash` of the build artifact)

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

{% /work %}
