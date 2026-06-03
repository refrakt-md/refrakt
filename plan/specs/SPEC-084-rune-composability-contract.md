{% spec id="SPEC-084" status="draft" tags="composability,engine,runes,dx" %}

# Rune composability contract

Runes are designed to nest — `sandbox` inside `juxtapose`, `recipe` inside
`preview`, a `map` inside a `card` media slot. The engine already propagates
parent context (`parentRune`), applies `contextModifiers`, and cascades
`childDensity`. What's missing is a *contract*: a declared, validated, and
documented statement of how a rune composes — designed so it holds up in an
**open plugin ecosystem** where third parties add runes we know nothing about,
and compose with (or inside) ours.

## Overview

### The governing principle: dependency asymmetry

Composition dependencies point one way. The composing party always knows what
it composes with; the composed-with party never needs to know its consumers. A
child knows its parent; an open container should know nothing about its
children.

Therefore **every composability fact is self-declared by the party that holds
the knowledge, pointing outward at a named rune (or, later, a capability) it
depends on.** The framework keeps no global "who may nest in whom" registry,
and an open container never enumerates its allowed children. This is the only
model that survives third-party runes on both sides of a nesting.

The existing fields already get the direction right:

- `parent` / `requiresParent` is declared **on the child** (`accordion-item →
  accordion`) — self-knowledge.
- `contextModifiers` is declared **on the adapting rune** (`hint` says "when in
  `hero`, add `--in-hero`") — self-knowledge.

(An earlier draft of this spec proposed container-side `allowedParents` /
`forbiddenParents` enumeration. That is a closed-world model and is explicitly
rejected: a container cannot enumerate children it has never heard of.)

### Two relationships, one of them validates

**1. Strict structural coupling** — `accordion-item`, `tab`, `tab-panel`,
`breadcrumb-item`, `juxtapose-panel`, `bento-cell`, `definition`, `step`,
`tier`, `map-pin`, `itinerary-day`, `itinerary-stop`. These runes are
*meaningless* outside their parent, and they always ship in the **same plugin**
as that parent — so the child genuinely knows its parent and validation is a
closed sub-world within one author's package. The child self-declares
`requiresParent`, and that is the one thing the validator checks. A third party
declaring their own child→parent pair (including a child that requires *our*
published parent) works identically, with zero knowledge of our ecosystem.

**2. Open composition** — hint-in-hero, map-in-card, widget-in-feature.
Containers are **open by default**: any rune may flow in, and there is nothing
to validate. The only thing on offer is *optional, additive adaptation*
(styling) — never permission.

Validation reduces to a single rule: **a rune is checked only if it declares a
constraint about itself.** No self-declaration → no check. This makes the
"vice versa" cases resolve cleanly:

| Case | Who declares | Cross-knowledge needed? |
|------|--------------|-------------------------|
| Our `map-pin` in our `map` | pin: `requiresParent: map` | none (same plugin) |
| Their `my-pin` in our `map` | their pin: `requiresParent: map` | they know our published map |
| Our `hint` in their `sidebar` | nobody — open composition | none |
| Their child in their parent | their child | we're not involved |

### Styling follows the same asymmetry

We cannot style a third-party rune inside our container (we don't know it), but
a container can adapt its **slot**, name-agnostically: `[data-section="media"] >
*` gives baseline sizing/clipping to *any* guest. That is the open-world-correct
way to make a `map` (or anything) sit cleanly in a `card` media slot — the
container adapts the zone, not the specific guest. A rune that wants *special*
adaptation still opts in via its own `contextModifiers`.

### Capabilities — the future cross-ecosystem generalization

Concrete rune *names* cover every real case today (all strict children co-ship
with their parents). The generalization, deferred beyond this milestone, is
**capability tokens**: a container declares `provides: ['tab-container']`, a
child declares `requires: 'tab-container'`, and the match is by capability, not
name — so anyone's container can satisfy anyone's child. Named `requiresParent`
ships first; capabilities are a later, additive layer.

## The contract

1. **`requiresParent` (self-declared, on the child).** Formalizes the existing
   `parent` field into a validated constraint. The child names the rune it must
   live inside. This is the only nesting fact the validator consults.
2. **Open containers.** No container declares allowed children. Containers
   adapt *slots* via zone selectors and offer `childDensity` as today.
3. **Context modifiers as the adaptation hook.** Every declared
   `contextModifier` must describe a meaningful visual adaptation *and* have CSS
   coverage (the `css-coverage` test already asserts this).
4. **Validation severity.** A `requiresParent` violation is a **warning** by
   default; for the structurally-meaningless set (the strict children above) it
   is an **error**. Non-breaking otherwise.
5. **Documentation + tooling.** A composability patterns guide under
   `site/content/extend/rune-authoring/`, and a CLI audit reporting
   `requiresParent` violations for a content tree and declared-but-unstyled
   context modifiers.

## Non-goals

- Container-side `allowedParents` / `forbiddenParents` enumeration (rejected — closed-world).
- `forbiddenParents` ("must not be inside X") — sound as self-knowledge but no concrete need yet; omitted to keep the surface small.
- Capability tokens — deferred (named `requiresParent` first).
- Runtime depth limits or lazy rendering (no evidence of a perf problem).

## Acceptance Criteria

- [ ] `RuneConfig` carries a self-declared `requiresParent` (formalizing `parent`), documented in the theme-authoring config API, with the open-world rationale.
- [ ] The pipeline validates `requiresParent` and surfaces violations — warning by default, error for the structurally-meaningless set — with tests including a third-party-style child requiring a known parent.
- [ ] No container-side child enumeration exists or is documented; the guide states containers are open by default.
- [ ] Every declared `contextModifier` has CSS coverage; dubious modifiers (Hero `in-feature`) are removed rather than styled.
- [ ] Container slots adapt name-agnostically via zone selectors (proven by `map`-in-`card`).
- [ ] A composability patterns guide ships in the rune-authoring docs; `refrakt inspect`/audit reports `requiresParent` violations and missing context-modifier CSS.

## References

- Engine context propagation: `packages/transform/src/engine.ts`
- Context modifier + `parent` declarations: `packages/runes/src/config.ts`, `plugins/marketing/src/config.ts`, `plugins/design/src/config.ts`
- Coverage carve-outs: `packages/lumina/test/css-coverage.test.ts`
- Realised by {% ref "WORK-336" /%}, {% ref "WORK-337" /%}, {% ref "WORK-338" /%}, {% ref "WORK-339" /%}

{% /spec %}
