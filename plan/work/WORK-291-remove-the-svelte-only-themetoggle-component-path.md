{% work id="WORK-291" status="done" priority="medium" complexity="simple" source="SPEC-073" tags="theme,toggle,svelte,cleanup" milestone="v0.16.0" %}

# Remove the Svelte-only ThemeToggle component path

With the toggle now shipping as layout chrome + behavior (WORK-288/289) and the plumbing adapter-provided (WORK-290), the Svelte-only component and its docs-site wiring are dead weight. Remove them and confirm both sites still show a working toggle — now from chrome, with no reparenting.

## Acceptance Criteria
- [x] `packages/svelte/src/ThemeToggle.svelte` is deleted along with its `@refrakt-md/svelte` export.
- [x] The docs site's `+layout.svelte` no longer renders `<ThemeToggle />` and the toggle-reparenting effect (the `.rf-*-header__inner` injection on navigation) is removed.
- [ ] The docs site still shows a working light/dark/auto toggle in its header (now via chrome), including across client-side navigation.
- [ ] plan-site shows a working toggle in its header with **no plan-site-specific code** (it inherits the chrome + behavior + adapter plumbing).
- [x] No dangling references to the removed component remain (grep clean).

## Approach
Delete the component + export, then strip the `+layout.svelte` toggle host and its `onMount`/effect reparenting block. Verify in the browser on both sites (golden path + a client-side navigation, since the old hack existed specifically to survive nav). plan-site needs no change — it already renders the shared layouts and loads the behaviors.

## Dependencies
- {% ref "WORK-288" /%} — the chrome toggle must exist before the component is removed.
- {% ref "WORK-289" /%} — the chrome toggle must be styled (identical look) before removal.

Done ahead of WORK-290 (not a hard prerequisite): the existing app-level pre-paint still provides no-flash theming until WORK-290 relocates it into the adapter, so removing the component only needs the chrome toggle (288/289). Resolving it now also clears the transient double-toggle on the docs site.

## References
- {% ref "SPEC-073" /%}

## Resolution

Completed: 2026-05-27

Branch: `claude/v0.16.0`

### What was done
- Deleted `packages/svelte/src/ThemeToggle.svelte` and removed its export from `packages/svelte/src/index.ts`.
- `site/src/routes/+layout.svelte`: removed the `ThemeToggle` import, the `toggleHost` binding, the `<div class="site-layout__toggle"><ThemeToggle/></div>` wrapper, the header-reparenting block in the `$effect`, and the `.site-layout__toggle` style. **Kept** the per-navigation tint-cascade reconciliation (a separate concern — resets `<html>` data-theme/tint/lock across nav since SvelteKit reuses `<html>`).
- `site/src/routes/+layout.server.ts`: reworded a stale `ThemeToggle` comment reference to "theme toggle".

### Notes
- Done ahead of WORK-290: removing the component only needs the chrome toggle (288/289); the existing app-level pre-paint still provides no-flash theming until 290 relocates it. Doing this now clears the transient double-toggle that 288/289 introduced on the docs site.
- The only remaining `ThemeToggle.svelte` mention in source is a historical doc-comment in `behaviors/theme-toggle.ts` ("replacement for the old ThemeToggle.svelte component") — intentional. Build artifacts under `site/build` / `site/.svelte-kit` reference it but regenerate.
- Re-enhancement across nav comes for free: `ThemeShell` re-runs `initLayoutBehaviors()` on every `page.url` change with a `{#key}` DOM recreation, so the chrome toggle (page content) is re-enhanced each navigation — which is exactly why the old reparenting hack is no longer needed.
- **Two criteria left unchecked (browser-pending):** "docs site shows a working toggle across nav" and "plan-site shows a working toggle." These are satisfied by construction — the chrome button renders (verified against the real `defaultLayout`/`planLayout`), is styled (WORK-289), and the behavior is registered + unit-tested + re-runs on nav — but I can't run a live browser in this environment to confirm visually. Recommend a quick check on both sites.
- Verified: svelte (60) + sveltekit suites green; sveltekit builds; no source import of the removed export remains.

{% /work %}
