{% spec id="SPEC-146" status="accepted" tags="runes, schema, seo, correctness, architecture" %}

# Name resolution across rune boundaries

## Summary

A schema row maps **names** to schema.org properties, and two resolvers turn a name
into nodes. They treat a nested rune's boundary in opposite ways, and both are
wrong at the edges: one cannot see past a boundary it should sometimes cross, the
other crosses every boundary and matches things it should not. The second is a
present-tense defect, reproduced below. The first blocks
{% ref "SPEC-145" /%}.

This is split out of SPEC-145 D10 so the resolver change can land and be proved
inert on its own, before anything is built on top of it.

## The two resolvers

| Resolver | Used by | Boundary | Matches |
|---|---|---|---|
| `findAllByName` (`packages/runes/src/lib/schema-table.ts:235`) | `properties` via `stamp`, `text` via `findByName` | **Stops at any nested `data-rune`** | `data-name`, `data-field` (+ kebab) |
| `findChildren` (`:528`) | `children` — retyping child runes | **Full subtree, no guard** | `data-name`, `data-field`, **and `data-rune`** |

Each is right about the case it was written for. `findAllByName`'s guard exists
because of a shipped bug its own doc comment records:

> **The search stops at another rune's node.** {% ref "ADR-008" /%}'s flat namespace
> is unique *per rune*, so the same name means different things in a parent and in a
> child it contains: `character` names its title span `name`, and so does every
> `character-section` inside it. Reaching across that boundary published a character
> whose `name` was the character plus each of its section headings.

And `findChildren` must cross boundaries, because crossing them is its job: it is
how `playlist` retypes the `track`s nested inside it.

## Problem 1 — `children` over-matches today

`findChildren` matches on `data-rune === name` as well as `data-name` / `data-field`,
descends without limit, and applies **every** match. So a `children` key whose name
happens to be a rune name matches that rune anywhere in the subtree — including a
rune the *author* nested, which the row was never about.

The collision is not hypothetical. `howto` and `recipe` both declare
`children: { step: … }`, and `step` is a real rune
(`plugins/marketing/src/tags/steps.ts:81` → `rune: 'step'`). An author writing a
`{% steps %}` block inside a `{% recipe %}` — an entirely reasonable thing to do —
nests `data-rune="step"` nodes in it. `pricing`'s `children: { tier }` collides with
the `tier` rune the same way.

**Reproduced.** A probe with `recipe`'s row shape, a legitimate own step, and an
author-nested `{% step %}` inside a `{% steps %}` wrapper:

```
--- author node typeof:   HowToStep
--- author node property: recipeInstructions
```

The author's unrelated content is stamped as one of the recipe's instructions, in
published RDFa.

**Severity, measured in two stages, because the first measurement was incomplete.** In the
two shapes probed first the mis-stamping did *not* reach the JSON-LD harvest, because the
mis-stamped node yields no readable text: `applyText` builds its `property="text"` wrapper
through `findByName`, which *is* boundary-guarded, so it never reaches the author's node,
and `collectJsonLd` drops a typed node with no properties. That produced the earlier
conclusion that this is an RDFa-level defect — an incorrect claim in published markup, which
the project treats as load-bearing output rather than decoration ({% ref "SPEC-130" /%}
cites RDFa Core 1.1 §7.5 for exactly this reason).

**It reaches the graph. Probed, and the earlier conclusion was wrong for the rows that
matter.** A playlist with one legitimate track and one author-written `{% track %}` inside
an unrelated container, run through `applySchemaTable` and `collectJsonLd`:

```json
{ "@type": "MusicPlaylist", "name": "My Mix",
  "track": [
    { "@type": "MusicRecording", "name": "Own Song",  "byArtist": "Own Artist" },
    { "@type": "MusicRecording", "name": "Unrelated", "byArtist": "Someone Else" }
  ] }
```

The author's unrelated content is published as a track of the playlist, with readable
values, in the JSON-LD graph.

**The mechanism is the re-rooted walk, and naming it matters because it bounds the fix.**
The guard is not bypassed from the parent's root — it is never consulted. `applySchemaTable`
calls `applyRow(item, childRow, readBag(item), i)` with the **author's node as root**
(`schema-table.ts:510`), and `findAllByName` exempts its own root: `visit(root, true)`, then
`if (!top && attrs['data-rune'] !== undefined) return`. So the child row's property sources
resolve freely inside foreign content, one level down. The earlier reasoning — *"`findByName`
is boundary-guarded, so it never reaches the author's node"* — was true of the walk from the
recipe's root and irrelevant to the walk that re-roots on the author's node.

**Which rows can do this is a closed, measured set: the two that carry their own
`properties`.** Of every schema child row in the repo, exactly two do —
`playlist`'s `musicRow` and `spokenRow` (`{ 'track-name': 'name', 'track-artist':
'byArtist', … }`, six properties) and `breadcrumb`'s `breadcrumb-item` row
(`{ name: 'name', url: 'item' }`). Both keys are real rune names
(`plugins/media/src/tags/track.ts:209`, `packages/runes/src/tags/breadcrumb.ts:105`), so
both collide. The rest — `recipe`, `howto`, `pricing`, `timeline`, `accordion` — carry
`text` or `generated` only, which is why the first probe missed it.

**A second-order effect, from the same call site.** When the parent retypes a child it runs
`clearProperties(item)` first (`:508`), on the author's node. So the over-match does not only
add a false claim: where the author's rune had declared properties of its own under a
different mapping, those are stripped and replaced by the parent's. The probe above cannot
show it, because `track`'s own mapping and the playlist row's agree on `track-name`; a
podcast row over a music track would.

**Unfiled.** This is a present-tense defect in published structured data, distinct from the
composition work this spec enables, and it has no bug report. Recorded here rather than
filed, per the standing preference for implementation notes on this branch.

## Problem 2 — a **node-sourced** property cannot reach across a boundary it should

This one does not bite today and cannot, because every rune's transform builds its own
subtree, so its named nodes are its own and the guard only ever suppresses correctly.
It bites the moment a rune's content is placed *inside* another rune, which is what
{% ref "SPEC-145" /%} does.

**Its scope is narrower than "composed runes cannot make claims", and the distinction
matters for scheduling.** A schema row's source resolves either from a node or from
the field bag on the rune's root, and the bag is untouched by nesting. So only
node-sourced values are affected. Measured against today's applier, one table over
two tree shapes — `castMemberSchema`'s `{ name: 'name', portrait: 'image' }`, where
`name` is an attribute and `portrait` is a node:

```html
<article data-rune="member" data-rune-fields='{"name":"Veshra"}'>
  <div data-rune="card">                                  <!-- boundary -->
    <img data-name="portrait" src="v.jpg">
  </div>
</article>
```

```json
// composed — portrait inside the primitive
{ "@type": "Person", "name": "Veshra", "@context": "https://schema.org" }

// declared — portrait at the rune's own root
{ "@type": "Person", "image": "v.jpg", "name": "Veshra", "@context": "https://schema.org" }
```

`findAllByName(root, 'portrait')` visits the `<article>` (exempt, `top`), reaches
`div[data-rune="card"]` and returns; `stamp` falls back to the bag (`:309-312`), which
holds no image because an image is a node and not a scalar. The property is absent with
no diagnostic.

The five resolution paths, and which of them this affects:

| Path | Resolver | Across a boundary today |
|---|---|---|
| `properties` from an **attribute** | `stamp` → bag fallback | works |
| `properties` from a **node** | `findAllByName` | **this problem** |
| `text` | `findByName` (same walk) | **this problem** |
| `entities` | `buildEntity` — node first, then bag (`:384-395`) | node source affected, attribute source works |
| `children` | `findChildren` | works — and is Problem 1 |

So a composed entity whose schema-bearing values are all attributes publishes
correctly before this spec lands; `character` is exactly that case
(`characterSchema` maps only `name` and `role`, both attributes). What this unblocks
is harvesting a value from authored content — an image, or a headline taken from a
heading — which is `recipe`, `event` and `cast-member`'s shape and the nicer authoring
experience.

## Mechanism — state ownership on the node

The guard means *stop at another rune's namespace*. It is implemented as *stop at any
`data-rune`*, which is only equivalent while ancestry implies ownership. So stop
inferring ownership from ancestry and put it on the node.

Whatever places a node on a rune's behalf stamps it:

```html
<img data-name="portrait" data-owner="character" src="…">
```

`findAllByName` replaces its hard stop with a *foreign* mode:

```ts
if (!top && attrs['data-rune'] !== undefined) {
  // Another rune. Its names are not mine — but it may hold nodes placed
  // on my behalf, so keep descending in foreign mode.
  for (const c of node.children ?? []) visit(c, false, true);
  return;
}
const named = (attrs['data-name'] === name || …) &&
              (!foreign || attrs['data-owner'] === owner);
```

Inside a rune's own nodes nothing changes — a name needs no marker. Past a boundary,
**only owner-marked nodes count**.

`findChildren` uses the same marker in the opposite direction: it keeps crossing
boundaries, and **rejects a match that is owner-marked for someone else, or unmarked
when the row's rune places its children itself.**

| | Today | After |
|---|---|---|
| `findAllByName` | hard stop → cannot reach placed content | crosses, admits only owner-marked |
| `findChildren` | crosses freely → over-matches authored content | crosses, rejects foreign matches |

One mechanism, one question — *is this node mine?* — read in opposite directions.

## Why it is backward compatible, and how that is proved

No rune today has content placed inside a nested rune, so the foreign branch yields
nothing for any existing rune and `findAllByName` behaves exactly as it does now.
In particular the bug the guard was added for stays fixed: declared `character`'s
sections are `character-section` runes whose `name` spans come from that rune's own
`createComponentRenderable` and carry no `data-owner`, so crossing in foreign mode
and requiring `data-owner === "character"` finds nothing — identical to the hard stop.

`findChildren` is the half that changes behaviour, deliberately, and the change is
narrow: a match is rejected only where it is foreign. `playlist`/`track`,
`pricing`/`tier` and `howto`/`step` keep working on their *own* children, because
those are emitted by the rune's own content model.

The gate is mechanical: `npm run seo:baseline:check` must show **zero diff** for
Problem 2's change, and a **reviewed diff** for Problem 1's — the baseline records
today's output including its defects by design ({% ref "SPEC-130" /%} / WORK-562), so
fixing an over-match *should* move it, and the diff is the evidence the fix landed.

## Decisions

### D1 — ownership is declared on the node, not inferred from ancestry

The alternative — keep inferring, and special-case composition in the resolvers —
puts knowledge of one feature inside a function that should only know about
namespaces. The marker makes the question local and the resolvers uniform.

### D2 — one marker, both resolvers

Resisting two mechanisms for what is one question. The asymmetry is in how the
answer is *used*, not in what is asked.

### D3 — `findChildren`'s fix ships with Problem 1's baseline diff reviewed, not suppressed

The over-match is a real defect, so correcting it changes recorded output. That diff
is reviewed and explained in the work item, never regenerated silently — the same
rule SPEC-130 sets for every schema change.

**And the diff is larger than this decision first assumed.** Written while Problem 1 read as
RDFa-only, it anticipated movement in the baseline's `rendered` harvest alone. The probe
above puts the over-match in the graph, so a fixture exercising a colliding nest moves
`jsonLd` too — which is the harvest {% ref "SPEC-130" /%} calls the one output nobody looks
at. Reviewing that half of the diff is the point of the gate, not a formality.

### D4 — the marker is pipeline bookkeeping and is stripped before render

It exists to answer a resolution question during the transform. Leaving it in the
output adds an attribute no consumer reads. The exception to check is the editor:
{% ref "SPEC-145" /%} D11 concludes editability follows `location.file` rather than
this marker, so nothing downstream should need it — but that conclusion is worth
confirming before the strip is written.

### D5 — this spec does not add composition

It changes two resolvers and adds a marker that only a composing mechanism can
currently set. Problem 1 is fixed for existing runes regardless. Problem 2's fix is
inert until SPEC-145 places content across a boundary, and that is the intended
sequencing: land the resolver, prove it inert, then build on it.

## Non-goals

- Adding composed runes, slot substitution, or any placement mechanism ({% ref "SPEC-145" /%})
- Changing what a schema row may declare — `properties`, `children`, `text`, `entities`, `generated` are untouched
- Changing `collectJsonLd`, the harvest points, or the baseline format
- Validating a schema table against schema.org — still explicitly out ({% ref "SPEC-130" /%} D5)
- Revisiting {% ref "ADR-008" /%}'s flat per-rune namespace; this spec depends on it rather than changing it

## Acceptance Criteria

- [ ] A probe reproducing Problem 1 exists as a test before the fix, asserting the wrong `typeof` / `property` on an author-nested rune of a colliding name
- [ ] The JSON-LD path is a regression test, not an open question: a playlist with an author-nested `{% track %}` publishes exactly one track before the fix is reverted and exactly one after, asserted on the graph rather than on the markup
- [ ] `breadcrumb`'s `breadcrumb-item` row — the second and only other child row carrying its own `properties` — is covered by the same assertion shape
- [ ] The node-sourced scope of Problem 2 is asserted by a test pair: one table over a composed and a declared tree, where the attribute-sourced property resolves in both and the node-sourced one resolves only after the fix
- [ ] A composed entity whose schema values are all attributes publishes correctly *before* this spec's change, asserted so the narrower scope cannot be lost
- [ ] `findAllByName` crosses a nested-rune boundary in foreign mode, admitting only nodes marked for the resolving rune
- [ ] `findChildren` rejects a match marked for another rune, and still matches a rune's own content-model children
- [ ] `npm run seo:baseline:check` shows zero diff attributable to the `findAllByName` change
- [ ] The baseline diff from the `findChildren` fix is reviewed and explained rather than regenerated silently (D3)
- [ ] The `character` / `character-section` name collision the guard was added for remains suppressed, asserted by a test naming that history
- [ ] `howto`/`step`, `recipe`/`step`, `pricing`/`tier` and `playlist`/`track` each keep resolving their own children, asserted per rune
- [ ] `refrakt contracts --check` reports no drift on either contract copy
- [ ] The marker is absent from rendered output (D4), and nothing in the editor or engine reads it
- [ ] The schema-table authoring documentation states that a `children` key naming a rune matches only that rune's own children, so the collision cannot be reintroduced by a new row

## References

- {% ref "SPEC-130" /%} — the schema table and its applier; the RDFa rule and the baseline's record-defects-too policy
- {% ref "SPEC-145" /%} — composed runes; where this was split from (D10) and the consumer of Problem 2's fix
- {% ref "ADR-008" /%} — the flat per-rune namespace whose boundary this is about
- {% ref "WORK-565" /%} — the applier's implementation and the RDFa wrapper's rationale
- {% ref "SPEC-151" /%} — the marketing audit; counts four live runes across four plugins that Problem 2 unblocks, all failing on the same two properties
- {% ref "SPEC-154" /%} — the learning audit; `recipe`'s `ingredient` is the first path-B property carrying a set, so Problem 2 must preserve multiplicity
- {% ref "SPEC-155" /%} — the media audit; `playlist`'s six-property child rows are the fixture for this spec's open question about a child row's own `properties`

{% /spec %}
