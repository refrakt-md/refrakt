{% work id="WORK-584" status="ready" priority="high" complexity="simple" source="ADR-029" tags="spike, engine, layout, contract, schema, research" %}

# Settle the three couplings ADR-029 assumes

{% ref "ADR-029" /%} records three couplings as open questions rather than
asserting them. Each is answerable by reading code and running existing
tooling; none needs a design. This item answers all three and writes the answers
back into the ADR, so the implementing spec is built on measurements rather than
expectations.

It is a research item. The deliverable is three findings, not a code change.

## Q1 — Does `layout` traverse the parent/child rune boundary?

`Track` has its own `RuneConfig` (`plugins/media/src/config.ts:63`), so in
principle a theme can restructure it independently of `Playlist`. But the
`layout` tree was built by {% ref "SPEC-081" /%} for intra-rune slots, and it may
not reach into a child rune's root.

**Method.** Read the layout assembly path in `packages/transform/src/engine.ts`
and `assemble.ts`. Then test it: give `Track` a `layout` entry reordering its
named parts (`track-name`, `track-artist`, `track-duration`) and observe whether
`refrakt inspect playlist` reflects it.

**Why it matters.** It decides whether item-level theming — the whole
playlist-as-card-grid case — is a config addition or an engine change, and
therefore how large {% ref "ADR-029" /%}'s implementing spec is.

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

- Q1 answered with the code path named, and a worked example showing whether a
  theme-supplied `layout` on `Track` takes effect.
- Q2 resolved into a decision: either {% ref "ADR-029" /%} decision 5 gains a
  dependency on wiring `data-meta-rank`, or it adopts a different bound.
- Q3 answered with the explicit list of runes whose `property=` rides on
  omittable visible nodes, derived from the seo-baseline fixtures.
- {% ref "ADR-029" /%}'s Open questions section is rewritten with the findings,
  and any decision the findings contradict is amended rather than left standing.
- Findings are recorded even where they confirm the assumption — a verified
  assumption and an unexamined one should not look alike in the record.

## Notes

Ordering: Q3 is the one that can change a decision, so do it first if the three
are split. Q1 is the one that sizes the follow-up spec. Q2 is bookkeeping on a
bug already filed.

{% /work %}
