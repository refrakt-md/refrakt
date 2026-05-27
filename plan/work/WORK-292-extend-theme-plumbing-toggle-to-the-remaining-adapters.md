{% work id="WORK-292" status="ready" priority="low" complexity="moderate" source="SPEC-073" tags="theme,adapters,html,astro,nuxt,next,eleventy" milestone="v0.16.0" %}

# Extend theme plumbing + toggle to the remaining adapters

SPEC-073's goal is "across adapters." WORK-290 establishes the no-flash injection pattern in the SvelteKit adapter; this item ports it to the rest (html, astro, nuxt, next, eleventy) so every adapter renders the chrome toggle and gets no-flash theming. The `html` adapter is the framework-agnostic proof: a toggle working with no Svelte runtime at all.

## Acceptance Criteria
- [ ] The pre-paint script + `<html>` tint attributes + `color-scheme` meta injection is provided by the `html`, `astro`, `nuxt`, `next`, and `eleventy` adapters at each one's document boundary (mirroring WORK-290).
- [ ] The `html` adapter renders a working light/dark/auto toggle (chrome + behavior) with **no Svelte** — the framework-agnostic proof from SPEC-073's final acceptance criterion.
- [ ] Each adapter's scaffold/output includes the behaviors bundle so `[data-theme-toggle]` is enhanced.
- [ ] No per-app theme hook boilerplate is required for these adapters.

## Approach
Generalize the injection helper from WORK-290 into a framework-neutral piece (it's already string transforms over the document head/`<html>`), then call it from each adapter's render/SSR seam. Verify on the `html` adapter first (no client framework), since it isolates the behavior + CSS path from any framework runtime.

## Dependencies
- {% ref "WORK-288" /%} — the chrome toggle + behavior.
- {% ref "WORK-290" /%} — the SvelteKit injection pattern to generalize.

## References
- {% ref "SPEC-073" /%}

{% /work %}
