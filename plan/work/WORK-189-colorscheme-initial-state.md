{% work id="WORK-189" status="ready" priority="medium" complexity="small" tags="dark-mode, ssr, config" source="SPEC-048" milestone="v0.14.0" %}

# theme.colorScheme initial state field

Add a `theme.colorScheme: 'auto' | 'light' | 'dark'` field to `refrakt.config.json` so authors can express "this is a dark-only site" or "default to light, ignore the user's system preference" without writing a custom script to set `data-theme` on `<html>`. Today the OS preference always wins (via `prefers-color-scheme`); this field gives authors first-class control over the SSR-emitted initial state.

## Acceptance Criteria

- [ ] `theme.colorScheme` field added to `SiteConfig` types and validated at config load
- [ ] When set to `'light'` or `'dark'`, SSR emits `<html data-theme="<value>">` and `<meta name="color-scheme" content="<value>">`, and the pre-paint script does *not* apply saved user preference (the page is locked)
- [ ] When set to `'auto'` (the default), SSR emits no `data-theme` attribute; the pre-paint script applies saved user preference or falls back to system `prefers-color-scheme`
- [ ] Behaviour is purely SSR/initial-state — the runtime theme toggle (a separate concern; see {% ref "WORK-211" /%}) is not introduced here
- [ ] Documentation in the SPEC-048 reference page explains the three values and what they emit
- [ ] Unit tests verify the SSR output for each value

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

{% /work %}
