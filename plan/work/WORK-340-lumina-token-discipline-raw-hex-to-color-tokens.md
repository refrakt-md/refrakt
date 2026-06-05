{% work id="WORK-340" status="done" priority="high" complexity="moderate" source="" milestone="v0.19.0" tags="lumina,tokens,polish" %}

# Token hygiene: phantom-token reconciliation + vocabulary cleanup

Lumina's CSS references several colour tokens that are **never defined**, so each
paints a stale literal fallback (a sky-blue from an old default theme, or a cool
Tailwind gray) that doesn't track light/dark. This is the real cause of the
"out of place" blue (e.g. the typography specimen background) and the cold-gray
muted text in dark mode. Fix the drift at the source, reconcile the vocabulary,
and keep the configurable shapes (presets, generator, docs) in correspondence.

## A. Phantom-token reconciliation (CSS consumers)

Seven phantom `--rf-color-*` tokens are referenced but undefined. Resolve each:

| Phantom | Resolution |
|---------|------------|
| `text-muted` (5 files) | **map → `muted`** (warm, dark-aware — fixes the cold muted text) |
| `heading` (6) | **map → `text`** |
| `accent` (3) | **map → `primary`** |
| `background` (1) | **map → `bg`** |
| `border-light` (1) | **map → `border`** |
| `warning-fg` (1) | **map → `warning`** (no `-fg` tier; the base semantic is the fg) |
| `primary-bg` (1) | **define** (see group B) |

- [x] All six "map" phantoms are repointed to their real tokens; the phantom names no longer appear in `packages/lumina/styles/`.
- [x] The stale literal fallbacks are purged: the 6 sky-blue `#0ea5e9` / `rgba(14,165,233,…)` fallbacks and the cool `#6b7280` muted fallbacks are removed (rely on the real token, no off-theme fallback).
- [x] The typography specimen-role label uses a **neutral** surface (not a colour wash); the redundant inner specimen padding is dropped (keep the outer), per the reported double-padding.
- [x] Genuine on-colour gaps are tokenised: `color: #fff` on coloured backgrounds in `audio.css` / `event.css` → an on-colour token. Demo/preset/device-chrome literals (tint presets, palette/swatch/spacing/typography specimens, mockup chrome, codegroup traffic-lights) are explicitly exempted.

## B. Vocabulary changes

- [x] **Define `--rf-color-primary-bg` as a *derived* token** — `color-mix(in oklch, var(--rf-color-primary) 10%, var(--rf-color-surface))` — with a dark variant mixing into the dark surface. Derived (not literal) so it tracks whatever `primary` any preset/config sets, with zero per-preset work; formalises the inline mix already in `state.css`.
- [x] **Remove the misnamed `--rf-color-primary-50…950` ramp** (a warm-neutral gray scale mislabelled "primary", used in only 3 places). Repoint its consumers — `src/config.ts` (`text: var(--rf-color-primary-50)`), `search.css`, `version-switcher.css` — to neutral/`surface` tokens.

## C. Contract-surface sync (the configurable shapes must correspond)

- [x] The theme presets (`packages/lumina/src/presets/*`) reference **only real tokens** — no phantoms, no removed ramp. (Confirmed today that no preset references the ramp; this guards against regressions.)
- [x] The token generator (`packages/transform/src/token-stylesheet.ts`) and `token-config-coverage` / per-preset tests reflect the new vocabulary; expectations updated for the removed ramp + added `primary-bg`.
- [x] The theme-authoring token reference docs list the real vocabulary (drop the ramp, document `primary-bg`).

## Approach
Mostly mechanical find-and-replace to the real tokens + fallback removal, plus the
one derived `primary-bg` definition and the ramp removal. Because tokens are a
permissive `Record` (no rigid type/JSON-schema enum) and no preset uses the ramp,
the blast radius is small and contained — but the C audit keeps the presets,
generator, tests, and docs honest so the vocabulary can't silently drift again.

## References
- Phantom usage: `packages/lumina/styles/runes/*.css`, `styles/layouts/*.css`
- Tokens: `packages/lumina/tokens/base.css`, `dark.css`; defaults in `packages/lumina/src/config.ts`
- Presets: `packages/lumina/src/presets/*`; generator: `packages/transform/src/token-stylesheet.ts`
- Tests: `packages/lumina/test/token-config-coverage.test.ts`, `*-preset.test.ts`
- Pairs with WORK-341 (dark parity)

## Resolution

Completed: 2026-06-05

Branch: `claude/v0.19-lumina-polish`

### What was done
- **Phantom reconciliation** (the root cause of the off-theme blue + cold muted text): repointed all 6 phantom tokens to real ones across `packages/lumina/styles/` — text-muted→muted, heading→text, accent→primary, background→bg, border-light→border, warning-fg→warning — and purged the stale `#0ea5e9`/`rgba(14,165,233,…)` sky-blue and `#6b7280` cool-gray fallbacks (also in spacing/on-this-page).
- **Defined `--rf-color-primary-bg`** as a derived translucent wash (`color-mix(primary 10%, transparent)`) in `tokens.ts` + `base.css`; repointed `state.css` selection, the search mark, and the version-switcher focus ring to it.
- **Defined `--rf-color-on-primary`** (mode-flipped) — fixes a real dark-mode bug (base dark `primary` is light, so the old `color: #fff` on audio/event buttons was invisible). Applied to audio/event.
- **Removed the misnamed `primary-50…950` ramp** end to end: `tokens.ts`, `base.css`, the `ThemeTokensConfig` type + `PrimaryScale` type/export/test (`packages/types`), the validator `KNOWN_SHAPE` (`token-validate.ts`), the `tideline` preset's vestigial blue scale, and the two `config.ts` tints (inlined their literals). Repointed the diagram (Mermaid) web component's ramp reads to surface/border so diagrams keep tracking the theme.
- **Typography**: role label → neutral (`surface-raised`); dropped the redundant inner specimen padding.
- **Contract sync**: presets, generator/validator, `token-config-coverage` + `token-contract` tests, theme-authoring docs (`css.md`, `creating-a-theme.md`), and the `create-refrakt` scaffold template all updated to the new vocabulary.

### Notes
- Full suite green (3066) + full `tsc` build clean.
- `primary-bg` is translucent (overlay) rather than mixed-into-surface, to match `state.css`'s selection-overlay semantics and give it a real consumer.
- Left the historical v0.14.0 migration doc and the generic `-scale` suffix convention (a still-valid path-mapping mechanism) untouched.

{% /work %}
