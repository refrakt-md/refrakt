{% spec id="SPEC-084" status="draft" tags="composability,engine,runes,dx" %}

# Rune composability contract

Runes are designed to nest — `sandbox` inside `juxtapose`, `recipe` inside
`preview`, a `map` inside a `card` media slot. The engine already propagates
parent context (`parentRune`), applies `contextModifiers`, and cascades
`childDensity`. What's missing is a *contract*: a declared, validated, and
documented statement of which runes may nest in which, and how a nested rune
adapts. Today `parent` is informational only, context modifiers are added ad
hoc, and there is no authoring guide — so composition is folklore rather than
a supported surface.

## Overview

This spec formalizes composability as a first-class part of the rune output
contract, ahead of third-party themes and plugins composing against it.

### Problems

- **No nesting validation.** `RuneConfig.parent` is documentation only. Writing
  `{% accordion-item %}` outside `{% accordion %}` silently renders broken
  output instead of erroring (`packages/transform/src/engine.ts` —
  `parentRune` is read for `contextModifiers` but never enforced).
- **Ad-hoc context modifiers.** `contextModifiers` are declared per rune with
  no review of whether the pairing is meaningful. Some are dubious (Hero
  declares `feature → in-feature`, which has no sensible rendering and is the
  lone `KNOWN_MISSING_SELECTORS` context entry), while genuinely useful
  pairings authors want (e.g. `map` in a `card` media slot) are absent.
- **Under-socialized.** There is no composability guide. The implicit
  contract (`parent`, `childDensity`, `contextModifiers`) is spread across
  config files with no single explanation of which runes are open containers
  (Feature, Hero, Card, Grid, Gallery, Preview), which are strict list parents
  (Accordion, Tabs, Steps, Pricing, Bento), and which pairs adapt via a
  context modifier.

### The contract

1. **Declared nesting.** Extend `RuneConfig` with an explicit composability
   declaration. `parent` is retained for strict child runes; add an
   `allowedParents` / `forbiddenParents` notion for runes that are valid only
   (or invalid) inside specific containers. Open containers need no
   declaration — anything may nest unless a child constrains itself.

2. **Build-time validation.** The cross-page pipeline (or a validate pass)
   emits a diagnostic when a constrained child appears outside its allowed
   parent. Severity is a warning by default (non-breaking), escalating to an
   error for runes whose output is structurally meaningless without the parent
   (accordion-item, tab, step, tier, bento-cell).

3. **Context modifiers as the adaptation hook.** Every declared
   `contextModifier` must (a) describe a meaningful visual adaptation and (b)
   have CSS coverage. The `css-coverage` test already asserts this; the
   `KNOWN_MISSING_SELECTORS` carve-outs for context modifiers are paid down or
   the modifier removed.

4. **Documentation + tooling.** A composability patterns guide under
   `site/content/extend/rune-authoring/`, and a CLI audit that reports
   declared-but-unstyled context modifiers and nesting-contract violations.

## Non-goals

- Runtime depth limits or lazy rendering of deep trees (no evidence of a perf
  problem today).
- A general slot/region system beyond the existing layout primitives.

## Acceptance Criteria

- [ ] `RuneConfig` carries an explicit, typed composability declaration
  (`allowedParents` / `forbiddenParents`), documented in the theme-authoring
  config API.
- [ ] The pipeline validates nesting and surfaces violations (warn/error per
  rune), with tests.
- [ ] Every declared `contextModifier` has CSS coverage; dubious modifiers
  (Hero `in-feature`) are removed rather than styled.
- [ ] A composability patterns guide ships in the rune-authoring docs.
- [ ] `refrakt inspect`/audit reports missing context-modifier CSS and nesting
  violations.

## References

- Engine context propagation: `packages/transform/src/engine.ts`
- Context modifier declarations: `packages/runes/src/config.ts`,
  `plugins/marketing/src/config.ts`, `plugins/design/src/config.ts`
- Coverage carve-outs: `packages/lumina/test/css-coverage.test.ts`
- Realised by {% ref "WORK-336" /%}, {% ref "WORK-337" /%}, {% ref "WORK-338" /%}, {% ref "WORK-339" /%}

{% /spec %}
