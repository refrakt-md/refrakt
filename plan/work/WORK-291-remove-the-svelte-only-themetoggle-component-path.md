{% work id="WORK-291" status="ready" priority="medium" complexity="simple" source="SPEC-073" tags="theme,toggle,svelte,cleanup" milestone="v0.16.0" %}

# Remove the Svelte-only ThemeToggle component path

With the toggle now shipping as layout chrome + behavior (WORK-288/289) and the plumbing adapter-provided (WORK-290), the Svelte-only component and its docs-site wiring are dead weight. Remove them and confirm both sites still show a working toggle — now from chrome, with no reparenting.

## Acceptance Criteria
- [ ] `packages/svelte/src/ThemeToggle.svelte` is deleted along with its `@refrakt-md/svelte` export.
- [ ] The docs site's `+layout.svelte` no longer renders `<ThemeToggle />` and the toggle-reparenting effect (the `.rf-*-header__inner` injection on navigation) is removed.
- [ ] The docs site still shows a working light/dark/auto toggle in its header (now via chrome), including across client-side navigation.
- [ ] plan-site shows a working toggle in its header with **no plan-site-specific code** (it inherits the chrome + behavior + adapter plumbing).
- [ ] No dangling references to the removed component remain (grep clean).

## Approach
Delete the component + export, then strip the `+layout.svelte` toggle host and its `onMount`/effect reparenting block. Verify in the browser on both sites (golden path + a client-side navigation, since the old hack existed specifically to survive nav). plan-site needs no change — it already renders the shared layouts and loads the behaviors.

## Dependencies
- {% ref "WORK-288" /%} — the chrome toggle must exist before the component is removed.
- {% ref "WORK-289" /%} — the chrome toggle must be styled (identical look) before removal.
- {% ref "WORK-290" /%} — adapter plumbing in place so docs/plan-site are fully chrome-driven.

## References
- {% ref "SPEC-073" /%}

{% /work %}
