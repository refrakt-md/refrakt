{% work id="WORK-432" status="ready" priority="high" complexity="moderate" source="SPEC-105" milestone="v0.23.0" tags="motion,animation,lumina,css,tokens,dimensions" %}

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

- [ ] A `dimensions/motion.css` + motion tokens define each character keyed on `data-reveal` × `data-in-view`; the theme owns duration/easing/distance/scale/stagger as tokens.
- [ ] **Global coverage, not per-rune:** all section runes are covered from one stylesheet — root keys on `[data-reveal][data-in-view]`, stagger on the `--rf-reveal-index` marker (not `> *`); no rune CSS file gains a baseline motion block.
- [ ] **Transform composition:** reveal uses the individual `translate`/`scale` properties, never the `transform` shorthand; verified against at least one hover-transform rune (`card`/`cta`) that it composes rather than clobbers.
- [ ] `blur` documents/applies a downgrade to `fade`; other characters animate compositor-only props; CSS coverage passes for the new selectors.

## Dependencies

- {% ref "WORK-431" /%} — consumes `data-reveal`/`data-stagger`/`--rf-reveal-index`.

## References

- {% ref "SPEC-105" /%} §4 · `packages/lumina/styles/dimensions/` (precedent: `state.css`), `packages/lumina/tokens/` · reduced-motion reset {% ref "WORK-352" /%} (`global.css`).

{% /work %}
