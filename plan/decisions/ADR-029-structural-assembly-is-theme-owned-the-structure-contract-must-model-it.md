{% decision id="ADR-029" status="proposed" date="2026-09-19" source="SPEC-081" tags="theme, contract, structure, assembly, layout, groups, architecture" %}

# Structural assembly is theme-owned; the structure contract must model it

## Context

{% ref "SPEC-081" /%} states its purpose in its opening paragraph: make the
structural skeleton declarative and rune-owned **"so a theme can reshape
structure without running rune code."** The identity-field rule agrees. From the
module docstring of `packages/transform/src/identity-fields.ts`:

> Everything else a theme may still override — `layout`, `structure`, `styles`,
> `contentWrapper`, `staticModifiers`, `autoLabel`, `editHints`, `projection`
> and the rest. It can hide, reorder, **re-wrap** and re-decorate; it just
> cannot redefine what a section *is*.

`IDENTITY_FIELDS` is `['block', 'modifiers', 'sections', 'variants']`. `layout`
is deliberately absent, and re-wrapping is named as a sanctioned theme power.

The structure contract does not model any of this:

```ts
// packages/cli/src/commands/contracts.ts:34
const contract = generateStructureContract(opts.config ?? baseConfig, {…});
```

Contracts are generated from `baseConfig` — rune config only, never a merged
theme. A theme exercising a documented right therefore invalidates a CI-gated
artifact silently, with no diagnostic anywhere.

### Why it has never fired

**No shipped theme overrides any rune.** Lumina says so in its own comment:

```ts
// packages/lumina/src/config.ts:5
/** …notably the ADR-028 identity guard, which Lumina must not trip
 *  (it overrides no rune at all). */
export const luminaOverrides: ThemeConfigOverrides = { tints: {…}, icons: {…} };
```

`proof-skin` is CSS and tokens with no config at all. The `create-refrakt`
scaffold emits `runes: {}` as an empty placeholder. Merged config equals base
config everywhere, so a contract generated from `baseConfig` is correct **by
accident**. The two committed copies — `contracts/structures.json` and
`packages/lumina/contracts/structures.json` — are byte-identical
(`44720ccbe303e231c081f9409747dc77`), which is consistent only because Lumina's
structure *is* base's structure.

### The project has already named this shape

{% ref "ADR-028" /%}, in its own Context, about `sections`:

> A theme can write `runes: { Card: { sections: {} } }` and silently disable
> `reading` on every card in a site. Nothing prevents it. (Lumina does not; **the
> capability is unused, not absent**.)

That is the same sentence one field over. ADR-028 fenced `sections` as identity
and left the structural-assembly fields classified as neither identity nor
presentation:

| Field group | Theme may override? | Contract models it? |
|---|---|---|
| `block`, `modifiers`, `sections`, `variants` | no — guarded | n/a |
| `styles`, `icons`, `tints` | yes | not structural |
| `layout`, `structure`, `blocks`, `metaFields`, `contentWrapper` | **yes, explicitly** | **no** |

The bottom row is the gap this decision closes.

### The forcing case

`Track` (`plugins/media/src/config.ts:63`) declares `block`, `parent`,
`defaultElevation` and `editHints` — and no `layout` at all. Its row geometry is
frozen in `packages/skeleton/styles/runes/track.css` as hand-written flex. Its
parts are already named (`track-name`, `track-artist`, `track-duration`,
`track-meta`, `track-description`), so the vocabulary for reshaping exists; the
grammar was never declared.

A theme wanting tracks as a card grid rather than a ladder of rows must override
the container's arrangement *and* `Track`'s internal layout — possibly grouping
`track-artist` / `track-duration` / `track-meta` into a byline row beneath the
title. Every one of those moves is permitted today. None is visible to the
contract.

## Decision

**Structural assembly is presentation, and the contract is split in two to say
so.**

1. **Confirm the classification.** `layout`, `structure`, `blocks`, `metaFields`
   and `contentWrapper` are theme-overridable. This ratifies what
   `identity-fields.ts` and {% ref "SPEC-081" /%} already state; it is recorded
   here because the contract generator encodes the opposite assumption.

2. **Two kinds of container — and the distinction is already emitted.**
   - A **semantic container** carries a `data-section` role, assigned from the
     rune's `sections` map. It is identity, governed by ADR-028, and a theme may
     not create, remove or re-role one.
   - A **presentational group** is an anonymous wrapper that exists so parts can
     share a geometry. It carries `data-name` and a BEM element class, and no
     section role.

   No new config channel is needed: `layout`'s tag-creating form already does
   this, and because `sections` is identity-guarded a theme structurally cannot
   promote its wrapper to a semantic one.

   ```ts
   Track: {
     layout: {
       root: ['track-name', 'byline'],
       byline: { tag: 'div', children: ['track-artist', 'track-duration', 'track-meta'] },
     },
   }
   ```

   An earlier draft proposed a separate `groups` channel emitting `data-group`.
   WORK-584 Q1 established that it would be redundant — see the findings below.

3. **The base contract is the rune-identity contract.** It records what a rune
   guarantees regardless of theme — its parts, `data-name`s, section roles, data
   attributes and resolved schema row. It is generated from `baseConfig` and is
   the artifact plugin authors and tooling code against.

4. **A theme contract records rendered structure.** Generated from merged theme
   config (`refrakt contracts --theme <pkg>`), it is the artifact that answers
   "what HTML does *this* theme produce." `generateStructureContract` already
   accepts a config parameter, so the plumbing exists. Both artifacts support
   `--check`.

5. **Theme layout may not drop a property-bearing node.** If a node carries a
   schema.org `property`, omitting it from a layout tree is a build error rather
   than a silent shrinking of the published graph.

6. **`guardIdentity` must be enabled wherever contracts consume theme config.**
   It defaults to off, and `merge.ts:27` names the contract generator as a
   deliberate unguarded path. That is correct while contracts read `baseConfig`
   only; it is wrong the moment they read a merged theme.

## Rationale

The alternative framings all fail on something concrete.

Making `layout` identity would reverse {% ref "SPEC-081" /%}'s stated purpose and
delete a capability the codebase documents as available. It would also not be
free: `contentWrapper` already lets a theme wrap content, so the line would fall
in an arbitrary place.

Generating a single contract from merged config loses rune identity as a stable
artifact. Plugin authors need a theme-independent reference — that is precisely
what Lumina's `./contracts` export is used for — and collapsing the two would
make every plugin's structural reference depend on whichever theme happened to
generate it.

Keeping one contract and documenting "contracts describe the default theme"
is the cheapest option and the worst. It leaves a CI gate that passes while
describing structure the site does not produce, which is the failure mode the
contract exists to prevent.

The semantic/presentational split is what makes the theme contract tractable.
Without it, every theme-created wrapper is indistinguishable from a rune's own
anatomy, and the two contracts diverge with no rule for reconciling them. With
it, the diff between base and theme contract is exactly the set of groups and
rearrangements a theme introduced — reviewable, and meaningful.

## Consequences

**The contract's stated purpose needs restating.** `CLAUDE.md` describes
structure contracts as *"the complete HTML structure the identity transform
produces for every rune."* That is true only for the default theme. It becomes
the rune-identity contract, and the theme contract takes the other half.

**Lumina's shipped contract stays correct.** It is the identity contract today
and remains so; the byte-identity with the dev copy stops being a coincidence
and becomes a property — Lumina overrides no rune, so its theme contract would
be identical anyway.

**Theme authors gain real power, and drift detection has to arrive with it.**
The `groups` channel plus a theme contract makes the playlist-as-grid case
expressible in config with no CSS. It also means a theme can now produce
structure nobody reviewed. The theme contract is the review surface.

**A new config channel.** `groups` is added surface on `RuneConfig`, and the
engine must emit `data-group`. Kept deliberately separate from `data-section` so
the identity/presentation boundary is legible in the rendered HTML, not only in
config.

**Rune authors should name parts generously.** A theme can only arrange the
parts a rune emits; the declared part list is the ceiling on theme expression.
`track` having no artwork slot is why a card grid of tracks would be a grid of
text boxes — a rune-authoring gap, not a theme limitation.

## Open questions

Three couplings are assumed by this decision. {% ref "WORK-584" /%} settles them;
Q1 is answered below and amended decision 2, Q2 and Q3 are outstanding. None is
a blocker, and all three should be settled before the implementing spec is
written.

1. ~~**Does `layout` reach across the parent/child rune boundary?**~~
   **Answered (WORK-584 Q1): yes, because there is no boundary to cross.**

   `identityTransform` (`engine.ts:138`) dispatches `transformRune` for *every*
   node whose `data-rune` resolves to a config key, nested ones included, and
   block-and-layout assembly runs inside that per-rune pass (`engine.ts:409`).
   A child rune assembles itself from its own config; `mapDataNames` does not
   recurse, so each rune's layout pool is its own direct `data-name`d children.

   Verified in `packages/transform/test/child-rune-layout.test.ts`:

   | | Result |
   |---|---|
   | A theme `layout` on `Track` reorders its parts | works |
   | A theme `layout` on `Track` creates a `byline` wrapper → `.rf-track__byline`, no `data-section` | works |
   | A wrapper named in `sections` gets its role | works — and `sections` is identity-guarded, so a theme cannot do this |
   | `Playlist`'s layout reaching into `Track`'s internals | correctly impossible |

   **Consequences.** Item-level theming is a *config* capability that already
   ships — no engine change, and the implementing spec shrinks accordingly.
   Decision 2's `groups` channel is redundant and was removed: `layout`'s
   tag-creating form provides it, and the semantic boundary is already legible
   in the output as the presence or absence of `data-section`.

   One nuance the test also pins: rune-created and theme-created anonymous
   wrappers are structurally identical — `Card`'s own `content` wrapper carries
   no section role either, since `cardSections` is `{ media, body }`. The output
   distinguishes *semantic from presentational*, not *rune-authored from
   theme-authored*. The latter is what the base-versus-theme contract diff in
   decisions 3 and 4 answers, which is the right place for it.

2. **Is the omission channel wired?** `data-meta-rank` is specified in
   {% ref "SPEC-026" /%} and {% ref "SPEC-079" /%} and styled by four rules in
   `packages/lumina/styles/dimensions/density.css`, but it is emitted by nothing —
   absent from `types.ts`, from the engine and from every `RuneConfig`. Density-
   driven omission is the intended bound on what a theme may hide, and it does not
   currently exist.

3. **Does schema ride on meta nodes everywhere?** `track.ts:203–206` pushes
   `artistMeta` / `durationMeta` / `urlMeta` / `numberMeta` as separate nodes from
   the visible spans, so dropping a visible part costs nothing structurally. If
   that holds ecosystem-wide it is the safety property licensing decision 5; if
   some runes carry `property` on visible content — `recipe`'s RDFa step carriers
   are the likely case — the rule must be enforced rather than assumed. The
   fixtures in `contracts/seo-baseline/` cover all 30 emitting runes and can
   settle it.

## Alternatives considered

**Add `layout` to `IDENTITY_FIELDS`.** Contracts stay single and stay true, at
the cost of deleting theme restructuring. Rejected: it contradicts
{% ref "SPEC-081" /%}'s purpose, and leaves `contentWrapper` as an unprincipled
exception on the other side of the line.

**One contract, generated from merged config.** Simpler tooling, one artifact.
Rejected: rune identity stops being expressible, and plugin authors lose the
theme-independent structural reference that Lumina's `./contracts` export exists
to provide.

**Document the limitation; change nothing.** Contracts are declared
default-theme-only. Rejected: the gate keeps passing while describing HTML the
site does not emit, which is worse than having no gate.

**Allow reordering but forbid theme-created wrappers.** A middle position that
avoids new config surface. Rejected: the byline case *is* wrapper creation, and
`contentWrapper` already grants a theme the power to wrap — the restriction would
be neither principled nor complete.

## References

- {% ref "SPEC-081" /%} — declarative structure assembly; the spec this decision governs
- {% ref "SPEC-080" /%} — the `metaFields` / `blocks` / `layout` model
- {% ref "ADR-028" /%} — attribute applicability is rune identity; the sibling decision and the source of the identity-field rule
- {% ref "SPEC-091" /%} — engine config variants; where `IDENTITY_FIELDS` originates
- {% ref "ADR-018" /%} — canonical layout vocabulary; governs the *author-facing* `layout` attribute, distinct from the theme-facing assembly tree decided here
- {% ref "SPEC-125" /%} — theme-independent attribute applicability
- {% ref "SPEC-130" /%} — declarative schema.org mapping; the source of the property-bearing-node constraint

{% /decision %}
