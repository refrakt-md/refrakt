{% work id="WORK-098" status="ready" priority="low" complexity="trivial" tags="vite, behaviors" milestone="v1.0.0" source="SPEC-031" %}

# Vite plugin — behavior init helper export

Export a thin `initBehaviors()` wrapper from `@refrakt-md/vite/behaviors` that frameworks can call after navigation to re-initialize interactive rune behaviors (accordion, tabs, datatable, etc.).

## Acceptance Criteria

- [ ] `@refrakt-md/vite/behaviors` export path works (package.json `exports` field)
- [ ] `initBehaviors(root?: Element)` wraps `initRuneBehaviors()` from `@refrakt-md/behaviors`
- [ ] Works in SPA re-navigation (SvelteKit `afterNavigate`, Vue `onMounted`/`watch`)
- [ ] MPA frameworks (Astro) don't need it — behaviors self-init on page load
- [ ] `@refrakt-md/behaviors` is a dependency of `@refrakt-md/vite`
- [ ] TypeScript types exported for the helper

## Approach

1. Add `src/behaviors.ts` — thin wrapper around `initRuneBehaviors()`
2. Add `./behaviors` subpath export in `package.json` `exports` field
3. Document usage patterns for SvelteKit, Vue/Nuxt, and Astro in JSDoc

## Dependencies

- {% ref "WORK-094" /%} — package must exist first

## References

- {% ref "SPEC-031" /%} (Behaviors section)
- `packages/behaviors/` — source of `initRuneBehaviors()`

{% /work %}
