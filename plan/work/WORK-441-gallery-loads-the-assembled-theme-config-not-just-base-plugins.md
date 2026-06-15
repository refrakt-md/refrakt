{% work id="WORK-441" status="draft" priority="medium" complexity="simple" source="SPEC-094" tags="tooling,gallery,theme" %}

# Gallery loads the assembled theme config (not just base + plugins)

The static gallery (the visual-regression harness from WORK-409) transforms
pages with `merged.config` — i.e. `coreConfig` plus the enabled plugins'
configs — but never calls `assembleThemeConfig`. The **site** assembles
`core → plugins → theme` so theme-level overrides reach the engine; the gallery
does not, so it can only ever render *base* output.

This is a latent gap in the regression net: any override a theme applies via
`mergeThemeConfig` (tints, icon swaps, and — after WORK-425 — per-rune
`defaultElevation`/`defaultProminence` deltas) is invisible in the gallery. The
gallery shows what a plugin ships, not what a theme actually renders.

**Not a blocker for WORK-425.** Under the agreed Option A, base surface defaults
live in core + plugin configs, which the gallery already loads, so default
`data-elevation`/`data-prominence` emission *is* gallery-verifiable today. This
item only matters once a theme overrides those defaults (Lumina currently
inherits the base defaults unchanged).

## Acceptance Criteria
- [ ] Gallery resolves the active theme config the same way the site does (via `assembleThemeConfig`), not `baseConfig + plugins` alone
- [ ] A theme-level override (e.g. a `defaultElevation` change or a tint preset) is reflected in the gallery's transformed output
- [ ] Falls back cleanly to base + plugins when no theme is configured
- [ ] Existing gallery snapshots regenerated / verified unchanged where Lumina inherits base defaults

## Approach
Locate where the gallery builds its transform config (cli) and route it through
`assembleThemeConfig` with the resolved theme, mirroring the site's assembly
order (`core → plugins → theme → extensions`). Confirm the theme is discoverable
from the project context the gallery already loads.

## References
- SPEC-094 — theme-system epic (visual-regression net)
- WORK-409 — gallery / regression harness
- WORK-425 — surface defaults (Option A: base + plugin configs)

{% /work %}
