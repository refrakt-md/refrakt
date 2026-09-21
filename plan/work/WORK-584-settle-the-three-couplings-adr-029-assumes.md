{% work id="WORK-584" status="in-progress" priority="high" complexity="simple" source="ADR-029" tags="spike, engine, layout, contract, schema, research" %}

# Settle the three couplings ADR-029 assumes

{% ref "ADR-029" /%} records three couplings as open questions rather than
asserting them. Each is answerable by reading code and running existing
tooling; none needs a design. This item answers all three and writes the answers
back into the ADR, so the implementing spec is built on measurements rather than
expectations.

It is a research item. The deliverable is three findings, not a code change.

## Q1 — Does `layout` traverse the parent/child rune boundary? — ANSWERED

**Yes, because there is no boundary to cross.** `identityTransform`
(`engine.ts:138`) dispatches `transformRune` for every node whose `data-rune`
resolves to a config key, nested ones included, and block-and-layout assembly
runs inside that per-rune pass (`engine.ts:409`). Each rune assembles itself
from its own `RuneConfig`; `mapDataNames` is flat, so a rune's layout pool is
its own direct `data-name`d children and nothing deeper.

Verified in `packages/transform/test/child-rune-layout.test.ts` (4 cases, added
by this item): a theme `layout` on `Track` reorders its parts and creates a
`byline` wrapper (`.rf-track__byline`, no `data-section`); a wrapper named in
`sections` does get its role, and `sections` is identity-guarded so a theme
cannot add one; `Playlist`'s layout cannot reach into `Track`.

**Consequences, applied to {% ref "ADR-029" /%}:**

- Item-level theming is an existing *config* capability. No engine change, and
  the implementing spec shrinks.
- Decision 2's proposed `groups` channel is **redundant and was removed**.
  `layout`'s tag-creating form already groups parts, and the semantic boundary
  is already emitted as the presence or absence of `data-section`.
- Rune-created and theme-created anonymous wrappers are structurally identical
  (`Card`'s own `content` wrapper has no section role either — `cardSections` is
  `{ media, body }`). The output distinguishes semantic from presentational, not
  rune-authored from theme-authored; the latter is the base-versus-theme
  contract diff's job, per decisions 3 and 4.

### Original framing, and why it was wrong

The question was posed as *"`Track` has its own `RuneConfig`, so in principle a
theme can restructure it — but the `layout` tree was built by
{% ref "SPEC-081" /%} for intra-rune slots and may not reach into a child rune's
root."*

That presumed a boundary the engine does not have. Assembly is not a single
whole-page walk that must descend into nested runes; it is a per-rune pass that
recurses naturally, so "reaching into a child rune" is not something `layout`
ever needs to do. The correct question was whether a child rune gets its own
pass — and it does.

Worth noting for the remaining two: the planned method here was
`refrakt inspect playlist`, which needs a built CLI. Driving `createTransform`
from source under vitest answered it in minutes with no build at all, and left a
regression test behind.

## Q2 — Is the omission channel wired anywhere?

Already answered in the negative and filed as {% ref "BUG-023" /%}:
`data-meta-rank` is specified, styled by four Lumina rules, and emitted by
nothing.

What remains for this item is the **consequence** for {% ref "ADR-029" /%}
decision 5, which names the density/rank channel as the bound on what a theme
may omit. If the channel does not exist, the bound is unenforceable and the
decision needs either a different bound or a dependency on wiring it.

**Method.** Decide which, and record it. No new investigation needed beyond
{% ref "BUG-023" /%}.

## Q3 — Does schema.org property emission ride on meta nodes everywhere?

`track.ts:203–206` pushes `artistMeta`, `durationMeta`, `urlMeta` and
`numberMeta` as nodes *separate* from the visible spans — the WORK-572 comment
at `track.ts:196` notes the visible spans carry no `property=` at all. If that
pattern holds across the ecosystem, then a theme omitting a visible part cannot
damage the published graph, which is the safety property licensing
{% ref "ADR-029" /%} decision 5.

It probably does not hold universally. {% ref "SPEC-130" /%}'s retype-and-wrap
cases are the likely counterexample — `recipe`'s `HowToStep` carriers wrap
visible step text because the RDFa object must be a typed resource.

**Method.** The fixtures in `contracts/seo-baseline/fixtures/` cover all 30
emitting runes at both harvest points. For each, determine whether `property=`
appears on a node that a `layout` tree could omit, or only on meta nodes.
Produce the list of runes where it rides on visible content.

**Why it matters.** If the list is empty, decision 5 is a documented invariant
and needs no enforcement. If it is not, the layout assembler must refuse to drop
a property-bearing node and fail the build — and the runes on that list are
where it would fire.

## Acceptance Criteria

- [x] Q1 answered with the code path named, and a worked example showing whether a theme-supplied `layout` on `Track` takes effect
- [ ] Q2 resolved into a decision: either {% ref "ADR-029" /%} decision 5 gains a dependency on wiring `data-meta-rank`, or it adopts a different bound
- [ ] Q3 answered with the explicit list of runes whose `property=` rides on omittable visible nodes, derived from the seo-baseline fixtures
- [ ] {% ref "ADR-029" /%}'s Open questions section is rewritten with the findings, and any decision they contradict is amended rather than left standing
- [ ] Findings are recorded even where they confirm the assumption — a verified assumption and an unexamined one should not look alike in the record

## Notes

Ordering: Q3 is the one that can change a decision, so do it first if the three
are split. Q1 is the one that sizes the follow-up spec. Q2 is bookkeeping on a
bug already filed.

{% /work %}
