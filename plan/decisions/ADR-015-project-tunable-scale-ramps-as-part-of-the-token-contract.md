{% decision id="ADR-015" status="accepted" date="2026-06-10" source="ADR-014" tags="tokens,scales,theming,architecture,config" %}

# Project-tunable scale ramps as part of the token contract

## Context

Named **scale ramps** — value ladders keyed by `sm`/`md`/`lg`/`xl` (and friends) —
underpin a large share of the attribute surface: `spacing`/`inset`, `radius`,
`elevation`, `frame-offset`, `substrate-size`/`-opacity`, card `height`, bento
`row-height`/`content-height`, the type scale, and (per {% ref "ADR-014" /%}) the
forthcoming `media-height`. They are the dimensional vocabulary the whole system
speaks.

Today they are **inconsistently sourced**:

- **Tokenized ramps** — `--rf-radius-{sm,md,lg}`, `--rf-spacing-{xs…2xl}`,
  `--rf-shadow-{none…lg}` are real design tokens in `packages/lumina/tokens/base.css`.
  A project can already retune them through `theme.tokens` (the typed token
  contract, `ThemeTokensConfig`) and `modes` — the same path that overrides
  colours.
- **Literal ramps** — others are hard-coded values keyed by data-attribute, not
  tokens, and therefore **cannot** be retuned from config:
  - `.rf-card[data-height="md"] { min-height: 18rem }`
  - `.rf-bento[data-content-height="md"] { --cell-content-height: 10rem }`
  - `.rf-bento[data-row-height="md"] { --bento-row-height: 24rem }` (has a token
    *hook*, `--rf-bento-row-height`, but no per-step tokens)

So whether a project can tune a ramp is an accident of which ramps happened to be
tokenized. The literal ramps also quietly violate the project's own convention
("reference design tokens — never hard-code values"). This surfaced from the
{% ref "ADR-014" /%} discussion, where the same "named layer, fixed vocabulary,
flexible value" shape recurred for the third time (after colours and
tints/backgrounds/frames).

## Options Considered

1. **Extend the existing `theme.tokens` contract** to cover all ramps, grouped
   (e.g. a `dimensions`/`scales` section), overridden exactly like colours and
   `modes`-aware. *Chosen.*

2. **A dedicated `scales`/`ramps` config block.** *Rejected (for now).* More
   ergonomic for defining a whole ladder at once, but it is a second
   token-override surface to maintain alongside `theme.tokens`/`modes`. The
   grouping in option 1 gets the same "define a ladder at once" ergonomics without
   a parallel mechanism. Revisit only if responsive-anchor definitions
   ({% ref "ADR-014" /%} Phase 2) grow rich enough to warrant their own schema.

3. **Leave ramps theme-only (status quo).** *Rejected.* The inconsistency
   persists and projects must fork CSS to retune a card height — exactly the kind
   of thing the token system exists to avoid.

4. **Allow an arbitrary ramp vocabulary** (projects add/remove steps, invent
   ramps). *Rejected.* Breaks the CSS-coverage tests (which derive selectors from
   a known step set), breaks cross-theme portability (a theme swap must still
   understand `md`), and breaks content portability (markup authored against one
   project's ramp must render elsewhere).

5. **Raw-CSS ramp values** (a per-step escape hatch). *Rejected.* Off-philosophy,
   non-portable, unvalidatable — the same reasoning that keeps frames
   escape-hatch-free.

## Decision

1. **Ramps are token-backed, never literal.** Tokenize the remaining hard-coded
   ramps as `--rf-{ramp}-{step}` tokens (`--rf-card-height-md`,
   `--rf-content-height-md`, per-step `--rf-bento-row-height-md`, the
   {% ref "ADR-014" /%} `media-height` ramp, …); rune CSS references the token,
   never a literal. This is a consistency/quality fix valuable on its own.

2. **Ramps live in the typed token contract and are overridden via
   `theme.tokens` (option A).** No new or parallel config mechanism. Override flows
   through `modes` for dark exactly as colours do. The ramps are **grouped within
   the contract** (a `dimensions`/`scales` section) so a project can define a whole
   ladder at once.

3. **Fixed vocabulary, flexible values.** Projects retune what each named step
   *resolves to*; they may not add steps, remove steps, or invent ramps. The step
   set per ramp is the stable contract — the same law as {% ref "ADR-014" /%}'s
   small fixed threshold set, one level down: the *names* are the contract, the
   *values* flex.

4. **Structured and validated, no raw-CSS escape hatch.** Ramp values are
   dimensions (or, post-{% ref "ADR-014" /%}, clamp anchors), type-checked by the
   token contract — never raw CSS — so they stay portable and theme-swappable.

5. **The general law (now explicit).** refrakt has two override layers and they
   obey one policy:
   - **Presets** — named *bundles*: tints, backgrounds, frames.
   - **Scales** — named *value ladders*: spacing, radius, type, elevation, heights,
     offsets.

   Both are **theme-defaulted, project-overridable by value, with a fixed
   vocabulary, structured (no raw CSS), and validated.** Colours already exemplify
   it; tints/backgrounds/frames obey it ({% ref "ADR-014" /%}); this decision
   extends it to every dimension ramp by closing the tokenization gap.

## Rationale

- **Consistency over accident.** Whether a ramp is tunable should be a deliberate
  policy, not a side effect of which ones were tokenized. Closing the gap makes the
  token system uniform and retires a standing violation of the "never hard-code
  values" convention.
- **Reuse over a new surface.** `theme.tokens` + `modes` already validate, cascade,
  and handle dark mode. Routing ramps through it adds zero new override concepts —
  the cheapest possible way to deliver the capability.
- **The fixed-vocabulary guardrail is what makes this safe.** It preserves the
  CSS-coverage tests, cross-theme portability, and content portability that a
  free-form ramp vocabulary would shatter.
- **It composes with {% ref "ADR-014" /%}.** Once ramps are `clamp()`-based, a
  project-tuned value is simply the *anchor* (min/max) the theme's clamp formula
  consumes; the container thresholds remain a fixed count while their values become
  tunable too. The two decisions reinforce rather than conflict.

## Consequences

- **Enabling work** (to be scoped, pairs with {% ref "ADR-014" /%} Phase 2):
  tokenize the literal ramps; extend the token-contract types with the grouped
  ramp section (builds on the token-contract typing work, {% ref "WORK-185" /%});
  update the CSS-coverage tests to derive ramp selectors from the fixed step set.
- **The token contract grows** (a deliberate, backward-compatible change — existing
  tokens are unchanged; new ramp groups are additive).
- **`media-height` must be token-backed from birth.** Whatever ships it
  ({% ref "ADR-014" /%} Phase 2) should define `--rf-media-height-*` tokens, not
  literals, so it lands on the right side of this decision.
- **Tooling:** `refrakt inspect` and the structure contracts should treat ramps as
  fixed-vocabulary token sets; a project override changes values, never the
  selector set.
- **Docs:** theme-authoring `config-api`/tokens gains a "tuning scale ramps"
  section; `runes/surfaces.md` notes that the size scales are project-tunable.
- **Escape-hatch-free scales** joins escape-hatch-free frames as an explicit
  invariant: dimension ramps must not gain a raw-CSS value form.

{% /decision %}
