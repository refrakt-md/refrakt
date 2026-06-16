{% work id="WORK-442" status="done" priority="medium" complexity="moderate" source="SPEC-105" milestone="v0.24.0" tags="motion,tokens,theme,config,dx" %}

# Promote reveal motion physics into the theme TokenContract

The scroll-reveal physics ({% ref "WORK-432" /%}) shipped as a local `:root` block in
`dimensions/motion.css`, so a site can only retune them with a raw CSS override. Promote
them into the theme's `TokenContract` so they become first-class, build-validated tokens a
site owner adjusts through `refrakt.config.json` `theme.tokens.reveal.*` — the same path that
already tunes `color`/`radius`/`spacing`.

This keeps the SPEC-105 author/theme split intact: physics stay a **project/theme-level**
concern (config, site-wide), never a per-instance Markdown author control.

## Acceptance Criteria

- [x] A `reveal` token group (`duration`, `easing`, `distance`, `scale-start`, `blur`, `stagger`) is added to the `TokenContract` type and the runtime `TOKEN_CONTRACT_SHAPE`, generating `--rf-reveal-*` vars via the standard token pipeline.
- [x] Lumina defines the reveal physics in `src/tokens.ts` (single source of truth); `dimensions/motion.css` drops its local `:root` defaults and reads the generated tokens.
- [x] A site can override the physics via `refrakt.config.json` `theme.tokens.reveal.*`, validated against the contract (unknown keys rejected); docs document the surface with an example.
- [x] Token generation drift test passes; a test covers reveal-token validation (valid override + unknown-key rejection); full suite green and CSS coverage passes.

## Approach

- `packages/types/src/token-contract.ts` — add an optional `reveal` group (optional so motion-free themes aren't forced to define it).
- `packages/transform/src/token-validate.ts` — mirror it in `TOKEN_CONTRACT_SHAPE`.
- `packages/lumina/src/tokens.ts` — add the `reveal` group with the current tuned values; rebuild regenerates `tokens/base.css`.
- `packages/lumina/styles/dimensions/motion.css` — remove the local `:root` token block (values now generated); keep the per-character offset vars.
- Docs: `theme-authoring/motion.md` gains the `refrakt.config.json` override example.

## References

- {% ref "SPEC-105" /%} · {% ref "WORK-432" /%} · `packages/transform/src/token-stylesheet.ts` (generator) · `SiteThemeConfig.tokens` in `refrakt.config.schema.json`.

## Resolution

Completed: 2026-06-16

Branch: `claude/v024-work431-reveal-facet`.

### What was done
- **`packages/types/src/token-contract.ts`** — added an optional `reveal` group (`duration`, `easing`, `distance`, `scale-start`, `blur`, `stagger`) to `TokenContract`. Optional so motion-free themes aren't forced to define it; the existing "fully-populated contract" type test still type-checks unchanged.
- **`packages/transform/src/token-validate.ts`** — mirrored the group in the runtime `TOKEN_CONTRACT_SHAPE`, so `theme.tokens.reveal.*` validates and an unknown key (`reveal.speed`) is rejected with a clear path.
- **`packages/lumina/src/tokens.ts`** — added the `reveal` group with the tuned values (1.3s / 2rem / 0.94 / 8px / 220ms); the build regenerates `tokens/base.css` with `--rf-reveal-*` via the standard pipeline (no generator change needed — it walks any nested group).
- **`packages/lumina/styles/dimensions/motion.css`** — dropped the local `:root` token block (now the single source of truth is `src/tokens.ts`); the `var(--rf-reveal-*)` usages gained sensible fallbacks so a theme can ship the stylesheet without the token group.
- **Docs** — `theme-authoring/motion.md` documents the `refrakt.config.json theme.tokens.reveal.*` override with an example and the author-vs-project nuance.
- **Tests** — `token-validate.test.ts` gains a valid-override case and an unknown-key rejection.

### Verification
- Full suite green (3375); contracts in sync; CSS coverage passes; token-generation drift test green (regenerated base.css carries the six `--rf-reveal-*` tokens).
- End-to-end: `generateThemeStylesheet({ reveal: { duration: '1.6s', stagger: '260ms' } })` emits `--rf-reveal-duration: 1.6s; --rf-reveal-stagger: 260ms`, and the override validates.

### Notes
- Honours the SPEC-105 author/theme split: physics are now a first-class **project/theme** knob (config-level, build-validated), never a per-instance Markdown control.

{% /work %}
