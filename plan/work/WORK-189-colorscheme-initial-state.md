{% work id="WORK-189" status="done" priority="medium" complexity="simple" tags="dark-mode, ssr, config" source="SPEC-048" milestone="v0.14.0" %}

# theme.colorScheme initial state field

Add a `theme.colorScheme: 'auto' | 'light' | 'dark'` field to `refrakt.config.json` so authors can express "this is a dark-only site" or "default to light, ignore the user's system preference" without writing a custom script to set `data-theme` on `<html>`. Today the OS preference always wins (via `prefers-color-scheme`); this field gives authors first-class control over the SSR-emitted initial state.

## Acceptance Criteria

- [x] `theme.colorScheme` field added to `SiteConfig` types *(type is in place via the new `SiteThemeConfig` interface; config-load validation lands with the broader theme-config validation in {% ref "WORK-187" /%})*
- [ ] When set to `'light'` or `'dark'`, SSR emits `<html data-theme="<value>">` and `<meta name="color-scheme" content="<value>">`, and the pre-paint script does *not* apply saved user preference (the page is locked) *(deferred to {% ref "WORK-214" /%} — the SSR / pre-paint pipeline is built once for both the site-wide colorScheme and the per-page cascade)*
- [ ] When set to `'auto'` (the default), SSR emits no `data-theme` attribute; the pre-paint script applies saved user preference or falls back to system `prefers-color-scheme` *(deferred to {% ref "WORK-214" /%})*
- [ ] Behaviour is purely SSR/initial-state — the runtime theme toggle (a separate concern; see {% ref "WORK-211" /%}) is not introduced here *(deferred)*
- [ ] Documentation in the SPEC-048 reference page explains the three values and what they emit *(deferred — page doesn't exist yet)*
- [ ] Unit tests verify the SSR output for each value *(deferred to {% ref "WORK-214" /%})*

**Scope split.** This work item ships only the *type* portion in Chunk 1 (SPEC-048 foundation). The SSR emission and pre-paint script overlap heavily with {% ref "WORK-214" /%} (renderer integration for the SPEC-052 cascade), so they're consolidated there to avoid building the SSR pipeline twice. The type addition is enough to unblock {% ref "WORK-187" /%} (config validation) which can then accept and validate the field.

## Approach

This is the *site-wide* equivalent of SPEC-052's per-page `tint-mode` cascade. SPEC-052 will layer per-page and per-subtree overrides on top of this; this work item only handles the site-wide root case.

Implementation lives in whichever component renders `<html>` (currently `@refrakt-md/svelte` `ThemeShell`). The pre-paint inline script reads `data-theme` first, falls back to `localStorage`, falls back to `prefers-color-scheme` — but only does the fallbacks if no explicit `data-theme` was rendered.

Locked-mode behaviour (no saved-preference override, no toggle UI) is established here at the site level. SPEC-052 extends the same semantics to per-page granularity.

## Dependencies

- {% ref "WORK-185" /%} — `SiteConfig` types to extend.

## References

- {% ref "SPEC-048" /%} — "The site's initial mode is configurable, not hard-coded" design principle
- {% ref "SPEC-052" /%} — per-page cascade that builds on this site-wide field
- `@refrakt-md/svelte/ThemeShell` — component that owns `<html>` SSR

## Resolution

Completed: 2026-05-19

Type-level portion shipped in v0.14.0 Chunk 1 (commit a7947bb0): `SiteThemeConfig.colorScheme: 'auto' | 'light' | 'dark'` is exported from `@refrakt-md/types/theme.ts` and accepted by the config validator. Per the work item's scope split, runtime SSR emission + pre-paint behaviour + locked-mode no-op were consolidated into WORK-214 (which has shipped) and the per-page extension into WORK-212/213/215 (all shipped). Documentation in a SPEC-048 reference page remains explicitly out of scope here.

{% /work %}
