{% work id="WORK-203" status="ready" priority="medium" complexity="small" tags="lumina, fonts, typography" source="SPEC-051" milestone="v0.14.0" %}

# Configure Google Fonts loading

Wire Lumina to load its four typefaces — Inter, JetBrains Mono, IBM Plex Sans, IBM Plex Mono — from Google Fonts via `<link>` in the document head. Per the SPEC-051 decision, no self-hosting at this point; the bundle stays slim and we use Google's CDN cache. Includes `<link rel="preconnect">` hints for performance.

## Acceptance Criteria

- [ ] Lumina's document head includes Google Fonts links for: Inter (multiple weights for body + UI), JetBrains Mono (regular + italic), IBM Plex Sans (regular + italic + bold), IBM Plex Mono (regular + italic)
- [ ] `<link rel="preconnect" href="https://fonts.googleapis.com">` and `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` present in head
- [ ] Token contract values for `font.sans` and `font.mono` in the neutral default reference the correct font family names with fallback stacks (`'Inter', system-ui, -apple-system, sans-serif` for sans; `'JetBrains Mono', ui-monospace, …` for mono)
- [ ] Tideline preset's `font.sans` / `font.mono` reference `'IBM Plex Sans'` / `'IBM Plex Mono'` with their respective fallback stacks
- [ ] Niwaki preset does *not* touch `font.*` — verified
- [ ] Fonts load on first paint for typical traffic — verify via Lighthouse on a built site that there's no FOIT longer than ~100ms
- [ ] `font-display: swap` semantics inherited from Google Fonts URL (it's the default; verify the URL parameters don't override)
- [ ] Documentation note on switching to self-hosting added to the lumina README — captures the trade-off and the steps for users who want it

## Approach

Single small change to wherever Lumina emits the document head — likely the SvelteKit ThemeShell or an equivalent template. Add four `<link>` tags plus the two preconnects.

Subset / weight selection: pick the *minimum* set of weights each font needs. For a docs site that's typically regular (400), medium (500), and bold (600 or 700) for sans; regular + bold for mono. Italics if the syntax palette uses them (it does, for comments). Each weight adds bytes — keep the URL parameters tight.

Tideline's font overrides land in the tideline preset module ({% ref "WORK-204" /%}) — this work item only ensures the *fonts are available* on the page. The neutral default's font values land in {% ref "WORK-200" /%}.

Privacy / GDPR note: Google Fonts CDN logs IP addresses. The lumina README should mention this and link to the self-hosting upgrade path; full guidance is post-v1.0 work.

## Dependencies

- {% ref "WORK-191" /%} — Lumina migrated to config-driven shape so font values flow through the contract.

## References

- {% ref "SPEC-051" /%} — typography decisions for neutral default and tideline
- Open question in SPEC-051 about self-hosting — explicitly deferred per the author's "no font self hosting at this point" decision

{% /work %}
