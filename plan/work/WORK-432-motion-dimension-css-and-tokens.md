{% work id="WORK-432" status="done" priority="high" complexity="moderate" source="SPEC-105" milestone="v0.24.0" tags="motion,animation,lumina,css,tokens,dimensions" %}

# Motion dimension CSS + tokens

{% ref "SPEC-105" /%} §4: a single `dimensions/motion.css` + motion tokens that render each
`reveal` character — covering **all** section runes from one stylesheet, with the
transform-composition and global-hook rules that keep it from becoming per-rune work.

## Scope

- **`dimensions/motion.css`** — per-character keyframes/transitions keyed on
  `data-reveal` × `data-in-view`, plus the stagger delay
  (`calc(var(--rf-reveal-index) * var(--rf-reveal-stagger))`).
- **Motion tokens** (`tokens/`) — duration, easing, travel distance, scale start, stagger
  interval; theme retunes character (calm vs punchy) purely via tokens.
- **Global hooks, not structure** — root entrance keys on `[data-reveal][data-in-view]`;
  stagger targets the engine's index marker (`[data-stagger][data-in-view] [style*="--rf-reveal-index"]`),
  never `> *`. No rune's own CSS file gains a motion block for the baseline.
- **Transform composition (critical)** — reveal animates the **individual `translate`/`scale`
  properties**, never the `transform` shorthand, so it composes with the ~48 Lumina files
  already using `transform` (hover-lifts, `frame` displacement, drawer/nav) instead of
  clobbering them.
- **`blur` downgrade** — documented (and theme-applied) fallback to `fade`; all other
  characters animate compositor-only properties. Reduced-motion handled by the existing
  global reset ({% ref "WORK-352" /%}).
- Per-part choreography (`__content`/`__media` offset) is opt-in polish, demonstrated but
  not required.

## Acceptance Criteria

- [x] A `dimensions/motion.css` + motion tokens define each character keyed on `data-reveal` × `data-in-view`; the theme owns duration/easing/distance/scale/stagger as tokens.
- [x] **Global coverage, not per-rune:** all section runes are covered from one stylesheet — root keys on `[data-reveal][data-in-view]`, stagger on the `--rf-reveal-index` marker (not `> *`); no rune CSS file gains a baseline motion block.
- [x] **Transform composition:** reveal uses the individual `translate`/`scale` properties, never the `transform` shorthand; verified against at least one hover-transform rune (`card`/`cta`) that it composes rather than clobbers.
- [x] `blur` documents/applies a downgrade to `fade`; other characters animate compositor-only props; CSS coverage passes for the new selectors.

## Dependencies

- {% ref "WORK-431" /%} — consumes `data-reveal`/`data-stagger`/`--rf-reveal-index`.

## References

- {% ref "SPEC-105" /%} §4 · `packages/lumina/styles/dimensions/` (precedent: `state.css`), `packages/lumina/tokens/` · reduced-motion reset {% ref "WORK-352" /%} (`global.css`).

## Resolution

Completed: 2026-06-16

Branch: `claude/v024-work431-reveal-facet` (continued from WORK-431).

### What was done
- New `packages/lumina/styles/dimensions/motion.css` (`@layer skin`) — the scroll-reveal choreography, keyed on `data-reveal` × `data-in-view`, imported in `lumina/index.css` after the other dimensions.
- **Physics tokens** in a `:root` block at the top of motion.css: `--rf-reveal-duration`, `--rf-reveal-easing`, `--rf-reveal-distance`, `--rf-reveal-scale-start`, `--rf-reveal-blur`, `--rf-reveal-stagger`. A theme retunes calm↔punchy purely via these (kept dimension-local, matching the `state.css` precedent, rather than threading through the typed `TokenContract`).
- **Per-character offsets** as inherited custom props on `[data-reveal="fade|slide|scale|blur"]`, so one hidden-state block covers every character; the animated unit reads them.
- **Global hooks, not structure**: root entrance keys on `[data-reveal][data-in-view]`; stagger on `[data-stagger][data-in-view] [style*="--rf-reveal-index"]` (the engine marker, never `> *`). No rune CSS gained a motion block.
- **Transform composition (critical)**: animates the individual `translate`/`scale` properties, never the `transform` shorthand — so it composes with the hover-lift/frame/drawer transforms Lumina already uses. Locked by `packages/lumina/test/motion-compose.test.ts`.
- **`blur`** documents the downgrade to `fade` (zero the blur token); the other characters animate compositor-only `opacity`/`translate`/`scale`. Reduced motion handled by the existing WORK-352 global reset.
- **Per-part choreography** demonstrated (opt-in): a sliding non-staggered section offsets its `[data-section="media"]` a beat behind the content. Not required.
- Excluded `reveal`/`stagger` from the gallery's universal-axis variant expansion (`packages/cli/src/commands/gallery.ts`) — a static reveal cell is identical to the default, so per-rune expansion was pure noise (cells 670→328 back to baseline).

### Notes
- Motion is theme choreography → skin only; `@refrakt-md/skeleton` has no motion, so a second theme ships its own motion.css.
- Full suite green (3369 + 4 motion-compose); CSS coverage passes; contracts in sync.

{% /work %}
