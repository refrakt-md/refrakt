{% work id="WORK-292" status="done" priority="low" complexity="moderate" source="SPEC-073" tags="theme,adapters,html,astro,nuxt,next,eleventy" milestone="v0.16.0" %}

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

## Resolution

Completed: 2026-05-27

Branch: `claude/v0.16.0`

### Delivered
- The **html adapter** no-flash injection: `renderFullPage` now injects the pre-paint script + `color-scheme` meta (always) and `<html>` tint attributes from an optional `tintCascade` (commit `e776524e`); `template-html`'s build passes `page.tintCascade`. Verified via the html render tests.

### Re-scoped
- On starting the other four adapters (astro/nuxt/next/eleventy) I found they have **no theme SSR infrastructure at all** — no pre-paint, no `data-tint`/`data-theme`, and no cascade threading to a document boundary, each with a different per-framework seam (astro template prop, eleventy transform, nuxt module head, next app-owned `<html>`). That's net-new theming per framework, not a small injection, and none has a runnable demo app here to verify. Rather than ship blind changes to four published packages, that work moved to {% ref "SPEC-074" /%} (verified per demo app).
- The html scaffold's missing client-JS bundle (so the toggle can *cycle*, not just no-flash) → {% ref "WORK-293" /%}.

### Notes
- The toggle button (chrome), behavior, and CSS are already shared (SPEC-073), so the remaining per-adapter work is purely the no-flash document seam + cascade threading.
- Marking done as the item's html scope is complete and its remaining scope is transferred to SPEC-074; the all-five-adapter acceptance criteria are intentionally left unchecked since they now belong to SPEC-074.

{% /work %}
