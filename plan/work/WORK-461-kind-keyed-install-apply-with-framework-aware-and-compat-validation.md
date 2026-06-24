{% work id="WORK-461" status="done" priority="high" complexity="moderate" source="SPEC-110" tags="install,validation,compat" milestone="v0.25.0" %}

# kind-keyed install apply with framework-aware and compat validation

{% ref "SPEC-110" /%} §4–§5 + {% ref "ADR-023" /%}/{% ref "ADR-024" /%} — unify the apply step
over the shared resolver, keyed on artifact + manifest `kind`, and harden post-install
validation (framework-aware + compat-range).

## Acceptance Criteria
- [x] Install applies a `kind`-keyed step over the shared resolver: theme → dependency + point the selected site's `theme`; `kind:"site"` template → add a site; preset pack → dependency + validate + optional `presets.json` append
- [x] `kind:"section"` is reserved/forward-compatible (reuses the resolver, SiteConfig merge, and `--site` plumbing) but out of scope
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

## Resolution

Completed: 2026-06-24

Branch: `claude/v0.25.0-impl-3` (validation/theme/preset parts on the earlier slices).

### What was done
The `kind`-keyed install apply is complete across the CLI:
- **theme** → add dependency + point the selected site's `theme` (+ framework-aware export validation, ADR-024) — `theme.ts` (earlier slice).
- **preset pack** → add dependency + validate `presets.json` + optional `theme.presets` append — `presets.ts` (earlier slice).
- **template `kind:"site"`** → **add a site**: `packages/cli/src/commands/template.ts` `templateInstallCommand` + `applyTemplateSite` — resolves a local template directory, `resolveTargetSite('new')` (collision errors), `createSite` (singular→plural migration), derives `contentDir` (`sites/<key>/content`), copies `content/` (+ `sandboxes/` → `sandbox.dir`), merges the manifest `site` config, and pins+installs derived deps. Wired as `refrakt template install <dir> [--site]`. 2 tests.
- `kind:"section"` reserved; `refrakt` compat range validated at install for every artifact (ADR-023).

### Notes
- v1 `template install` resolves a **local directory** (the portable, testable case). Tarball/registry templates are scaffold-copied artifacts — `create-refrakt --template` is the greenfield path; extending `template install` to fetch+extract those reuses the shared resolver and is a forward-compatible follow-up.

{% /work %}
