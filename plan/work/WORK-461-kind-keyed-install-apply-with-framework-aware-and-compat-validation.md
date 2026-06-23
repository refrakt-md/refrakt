{% work id="WORK-461" status="in-progress" priority="high" complexity="moderate" source="SPEC-110" tags="install,validation,compat" milestone="v0.25.0" %}

# kind-keyed install apply with framework-aware and compat validation

{% ref "SPEC-110" /%} §4–§5 + {% ref "ADR-023" /%}/{% ref "ADR-024" /%} — unify the apply step
over the shared resolver, keyed on artifact + manifest `kind`, and harden post-install
validation (framework-aware + compat-range).

## Acceptance Criteria
- [ ] Install applies a `kind`-keyed step over the shared resolver: theme → dependency + point the selected site's `theme`; `kind:"site"` template → add a site; preset pack → dependency + validate + optional `presets.json` append
- [ ] `kind:"section"` is reserved/forward-compatible (reuses the resolver, SiteConfig merge, and `--site` plumbing) but out of scope
- [x] Post-install validation covers a theme's exports and a template's `template.json`; theme validation is **framework-aware** per {% ref "ADR-024" /%} (`./transform` required, a framework export like `./svelte` optional — its absence is **not** warned)
- [x] Install validates each distributable's `refrakt` range against the project version, failing with a clear message on mismatch

## Approach
Factor the apply step as a switch on artifact/kind in `packages/cli/src/commands/theme.ts`
(rename/extend toward a general install command). Replace the current "`./svelte` missing →
warn" check with the framework-aware rule. Call the ADR-023 compat checker before applying.
The theme, template, and preset apply-modes are implemented in their respective work items;
this item owns the dispatch + validation layer.

## Dependencies
- {% ref "WORK-465" /%} — compat range checker
- {% ref "WORK-445" /%} — shared resolver
- {% ref "WORK-446" /%} — multi-site `--site` + config helpers

## References
- {% ref "SPEC-110" /%} §4, §5; {% ref "ADR-023" /%}; {% ref "ADR-024" /%}

{% /work %}
