{% work id="WORK-203" status="done" priority="medium" complexity="simple" tags="lumina, fonts, typography" source="SPEC-051" milestone="v0.14.0" %}

# Configure Google Fonts loading

Wire Lumina to load its four typefaces — Inter, JetBrains Mono, IBM Plex Sans, IBM Plex Mono — from Google Fonts via `<link>` in the document head. Per the SPEC-051 decision, no self-hosting at this point; the bundle stays slim and we use Google's CDN cache. Includes `<link rel="preconnect">` hints for performance.

## Acceptance Criteria

- [x] Site `app.html` includes Google Fonts link for Inter (weights 300–700) and JetBrains Mono (weights 400/500/700) — the neutral default's typography pair. Plex Sans / Plex Mono ship with the tideline preset in {% ref "WORK-204" /%}, loaded on demand by sites that opt in.
- [x] `<link rel="preconnect" href="https://fonts.googleapis.com">` and `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` present in head
- [x] Token contract values for `font.sans` and `font.mono` in the neutral default (`luminaTokens.font`) reference the correct family names with fallback stacks
- [ ] Tideline preset's `font.sans` / `font.mono` reference `'IBM Plex Sans'` / `'IBM Plex Mono'` *(deferred to {% ref "WORK-204" /%} — lands with the preset module itself in Chunk 7)*
- [ ] Niwaki preset does *not* touch `font.*` *(deferred to {% ref "WORK-205" /%})*
- [x] `font-display: swap` semantics inherited from Google Fonts URL (`&display=swap` parameter present)
- [ ] Lighthouse FOIT verification *(post-merge manual check)*
- [ ] Self-hosting documentation note in the Lumina README *(deferred — out of scope for this chunk; covered by the migration note in {% ref "WORK-210" /%})*

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

## Resolution

Completed: 2026-05-19

Shipped: `site/src/app.html` includes preconnect tags for `fonts.googleapis.com` and `fonts.gstatic.com`, plus a Google Fonts CSS link for Inter (300–700) and JetBrains Mono (400/500/700) with `&display=swap`. `luminaTokens.font.sans` / `font.mono` reference the matching family names + fallback stacks. Tideline's `font.*` overrides ship with WORK-204 (Plex Sans / Plex Mono) and niwaki doesn't touch `font.*` per WORK-205. Lighthouse FOIT verification + a self-hosting README note remain post-merge / out-of-scope per the work item's deferral notes.

{% /work %}
