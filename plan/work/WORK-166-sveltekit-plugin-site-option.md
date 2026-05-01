{% work id="WORK-166" status="draft" priority="medium" complexity="moderate" tags="sveltekit, config, multi-site" source="ADR-010" milestone="v0.11.0" %}

# SvelteKit plugin accepts `site` option

Update `@refrakt-md/sveltekit` to accept a `site: string` option in its plugin factory. When a project declares multiple sites under `sites.*`, each SvelteKit app picks its target via this option. Single-site projects (and the legacy flat shape) continue to work without changes.

## Acceptance Criteria

- [ ] `refrakt({ ... })` plugin factory accepts an optional `site?: string` field
- [ ] When the loaded config has exactly one site and `site` is omitted, the plugin uses that site automatically
- [ ] When the loaded config has multiple sites and `site` is omitted, the plugin throws at config-load time with the list of available names
- [ ] When `site` references an undeclared name, the plugin throws with the available names and a "did you mean?" suggestion
- [ ] Plugin reads `contentDir`, `theme`, `target`, `packages`, `routeRules`, `icons`, `backgrounds` from the resolved site entry — not from the top level
- [ ] `loadContent()` and any virtual-module generation use the resolved site as the source
- [ ] Tests cover: single-site default, single-site with explicit name, multi-site with explicit name, multi-site missing name (error), unknown site (error)
- [ ] Existing `site/vite.config.ts` continues to build without modification (single-site path)

## Approach

1. Update the plugin factory's options interface to include `site?: string`.

2. Add a `resolveSite(config, requested?: string)` call (reuse the helper from WORK-164 if exposed; otherwise duplicate a small version here) that returns the canonical site entry.

3. Replace any direct reads of top-level `config.contentDir` / `config.theme` / etc. with `resolved.contentDir` / `resolved.theme`.

4. HMR: include the resolved site name in the cache key so two SvelteKit apps in the same monorepo don't collide.

## Dependencies

- {% ref "WORK-159" /%} — needs the normalized `sites` map

## References

- {% ref "ADR-010" /%} — Unified root-level refrakt config (SvelteKit plugin consequences)
- `packages/sveltekit/src/` — plugin factory and content loader

{% /work %}
