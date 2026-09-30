{% spec id="SPEC-154" status="draft" tags="runes, composition, learning, plugins, feasibility, backlog" %}

# Learning plugin composition audit

## Summary

Seventh plugin audited against {% ref "SPEC-145" /%}, and the first where most of the
subject **does not exist yet**. Learning ships two runes (725 lines) and has six more
planned in {% ref "SPEC-008" /%}, pending since before the composition work began. Auditing
them together changes the question the previous six audits asked:

| Audits 1–6 | This audit |
|---|---|
| *Should this shipped rune be a composition?* | *Should this planned rune be built at all?* |

For four of the six planned runes the answer is no — and the deliverable is therefore not
code but a **backlog disposition**. {% ref "WORK-500" /%} is already open, `draft`, and asks
for precisely that: *"a reviewed, per-item judgment pass — not an automated flip"* over the
13 `pending` {% ref "SPEC-008" /%} items. This audit supplies the judgment for six of them.

## The disposition of the six planned runes

| Rune | schema.org | Blocker | Disposition |
|---|---|---|---|
| `objective` | — | none | **Composition.** A list under an intro paragraph in an `<aside>`. Zero blockers, today. |
| `prerequisite` | — | none | **Composition + {% ref "SPEC-144" /%}.** Self-closing, all data in attributes. |
| `concept` | `DefinedTerm` | SPEC-146 Problem 2 | **Composition, gated.** `term` is an attribute; the definition is the first paragraph. |
| `exercise` | — | partial | **Mostly composition** — see below; the work item over-budgets JS. |
| `quiz` | `Quiz` | behavior **and** content model | **Plugin rune, permanently.** |
| `glossary` | `DefinedTermSet` | `postProcess` over other pages' prose | **Plugin rune, permanently.** |

### `prerequisite` is the best first {% ref "SPEC-144" /%} consumer in the repo

Its own note concedes the shape: *"The rune itself is simple — the complexity is in the
build pipeline integration."* Every value is an attribute (`path`, `label`, `required`), so
it resolves on path A and **publishes correctly before {% ref "SPEC-146" /%} lands** — and
its entire purpose is the edge graph, which is SPEC-144's `registers` declaration.

That combination exists nowhere in the shipped corpus: a rune whose cross-page identity is
its whole value, whose per-page output is trivial, and which has **no existing behaviour to
preserve**. Every shipped SPEC-144 candidate is a migration with a registry-identity gate;
this one is a greenfield proof.

### `exercise` — the work item budgets a behavior for what the platform does natively

WORK-008 lists *"Add hint revelation + solution toggle behaviors in `packages/behaviors/`"*.
But `details` is a core rune (`packages/runes/src/tags/details.ts`) with `summary` and `open`
attributes, a plain sequence content model, **no behavior and no `interactive` flag** — it
emits native `<details>`/`<summary>`. A solution toggle needs no JavaScript at all, and
hints as independent disclosures need none either.

What genuinely needs JS is the *sequential gate* — "each hint revealed in order" — and
`accordion` already carries a behavior for one-open-at-a-time. So `exercise` is a
composition over `section` + `details`, and the sequential variant is the only part that
would justify a plugin rune. **Worth recording because the work item's own implementation
plan would have produced a behavior nobody needed**, and it was written before `details`
existed in its current form.

### `quiz` is blocked twice over, independently

- **A behavior.** `<form>` plus *"score calculation, answer checking, and result display"*.
  A `form` behavior exists in the registry, but it validates and submits; it does not score.
  {% ref "SPEC-145" /%} D2 gives a composed rune no behavior and no component, so this is
  the {% ref "ADR-036" /%} escape hatch by design, exactly as `map` is
  ({% ref "SPEC-148" /%} D3).
- **A custom content model.** `[x]` markers on list items to mark correct answers —
  WORK-009 says it *"needs custom parsing in the content model — similar to how GFM task
  lists work but repurposed for quiz answers."*

Either alone would settle it. Both means `quiz` is not a candidate to revisit as the
vocabulary grows.

### `glossary` is the pending-rune counterpart to SPEC-144 D2's excluded hook

Its implementation note is unambiguous: *"the pipeline collects all glossary terms and
rewrites matching text nodes across other pages into links… implemented as a post-build
pass in `@refrakt-md/content`."*

That is `postProcess` rewriting arbitrary prose on pages the rune does not appear on.
{% ref "SPEC-144" /%} D2 excludes `postProcess` from declarative registration, and
{% ref "SPEC-147" /%} found that exclusion loses a real capability. `glossary` is the second
witness, and the cleaner one, because nothing has been built yet to argue about.

## The two shipped runes, per property

{% ref "SPEC-148" /%} D1's unit still applies, and both runes are already in
{% ref "SPEC-151" /%} D3's six-rune `pageSectionProperties` set.

### `howto` — `HowTo`

| Property | schema.org | Source | Path | Composed |
|---|---|---|---|---|
| `headline` | `name` | `pageSectionProperties(header)` | **B-intrinsic** | **lost** |
| `blurb` | `description` | `pageSectionProperties(header)` | **B-intrinsic** | **lost** |
| `estimatedTime` | `totalTime` | attribute → `properties` meta | A | ✓ |
| `tool` | `HowToTool` / `tool` | `<li>`s of the `ul` | E | ✓ |
| `step` | `HowToStep` / `step` | `<li>`s of the `ol` | E | ✓ |

### `recipe` — `Recipe`, the most path-B-dependent rune audited

| Property | schema.org | Source | Path | Composed |
|---|---|---|---|---|
| `headline` | `name` | `pageSectionProperties(header)` | **B-intrinsic** | **lost** |
| `blurb` | `description` | `pageSectionProperties(header)` | **B-intrinsic** | **lost** |
| `prepTime`, `cookTime`, `servings` | `prepTime`, `cookTime`, `recipeYield` | attributes | A | ✓ |
| `mediaImage` | `image` | `extractMediaImage` over the media zone | **B-intrinsic** | **lost** |
| `ingredient` | `recipeIngredient` | every `<li>` stamped `data-name` | **B, repeated** | **lost** |
| `step` | `HowToStep` / `recipeInstructions` | `<li>`s of the `ol` | E | ✓ |

**Four properties on path B, and `ingredient` is the first audited case where path B carries
a *set* rather than a single value** — six `<li>`s, all stamped, relying on `findAllByName`
applying every match. So SPEC-146 Problem 2's fix has to preserve multiplicity here, not
just reachability, which no prior audit's fixture exercises.

`mediaImage` is also where two separate constraints converge on one property: it is path B
*and* it sits in a media zone, so a composed recipe placing it in `card`'s media slot hits
{% ref "SPEC-148" /%}'s delimiter rule (the `---` must be emitted unconditionally) at the
same time. Worth being the migration's first test rather than its last.

## The finding worth more than the verdict

`match: 'list:ordered'` and `'list:unordered'` **exist**, are implemented
(`packages/runes/src/lib/resolver.ts:98-104`), tested
(`packages/runes/test/resolver.test.ts:93`), and used by `recipe`
(`plugins/learning/src/tags/recipe.ts:126`, `:130`) and `steps`
(`plugins/marketing/src/tags/steps.ts:130`).

**`howto` — the sibling rune in the same plugin — does not use them.** It matches
`list|tag` greedily into one `body` field and then separates the lists imperatively:

```ts
for (const node of allNodes) {
  if (node.name === 'ul')      tools.push(...(node.children || []));
  else if (node.name === 'ol') steps.push(...(node.children || []));
}
```

Two runes, one plugin, the same ordered-versus-unordered problem, and only one of them
declares it. This is the **fifth** instance of the pattern this series keeps producing —
*the primitive exists, adoption is partial, the bespoke code predates it* — and the
tightest, because the adopter and the hold-out are siblings. `howto`'s content model is a
five-line edit away from being as declarative as `recipe`'s, entirely independently of
composition.

## Recipe is {% ref "SPEC-145" /%} D15's reference case

D15 — *a rune may declare several templates, selected by a declared attribute* — was argued
on capability grounds. `recipe` proves a first-party rune needs it **today**:

```ts
variants: {
  'media-position': {
    cover: {
      staticModifiers: ['cover'],
      rootAttributes: { 'data-cover-scope': 'header' },
      layout: {
        root: ['cover-band', 'content'],
        'cover-band': { tag: 'div', attrs: { 'data-color-scheme': 'dark' },
                        children: ['media', 'preamble'] },
        content: { tag: 'div', children: ['metadata', 'ingredients', 'steps', 'tips'] },
      },
    },
  },
},
```

A second assembly of the same slots, selected by an attribute value — which is D15's
description exactly. It reaches for {% ref "SPEC-091" /%}'s engine-stage `variants` because
no template mechanism existed, and D15 records that `variants` runs two stages too late for
a composition. So `recipe` is to D15 what `event` is to SPEC-146 Problem 2
({% ref "SPEC-148" /%} D4): the measured case any implementation should be checked against.

## The plugin stays, on two runes that do not exist

Fourth plugin that stays, after `design` ({% ref "SPEC-150" /%}), `marketing`
({% ref "SPEC-151" /%}) and `plan` ({% ref "SPEC-152" /%}) — and the first whose reason is
entirely in its backlog. `howto` and `recipe` both compose; `quiz` and `glossary` never can.

The plugin also has **no pipeline hooks at all** today (`plugins/learning/src/index.ts`
exports runes, config and translations, nothing else), while two of its six planned runes
cannot work without them. Learning's whole cross-page story is unbuilt, which is why this is
the audit where the planned set mattered more than the shipped one.

## A hazard in the pending items themselves

All 13 `pending` {% ref "SPEC-008" /%} work items predate {% ref "SPEC-130" /%}
(`implemented`; SPEC-008 is still `review`). Each carries a **"Transform Output"** section
listing `typeof`, `Properties` and `Refs` — a mechanism that schema tables replaced. WORK-007
even specifies `typeof: Concept` where the schema.org type is `DefinedTerm`, which the same
document states two lines earlier.

Anyone implementing one of these from its work item would build against the pre-SPEC-130
contract. That is worth a note on the items rather than a discovery during review.

## Decisions

### D1 — this audit's output is a backlog disposition, not a migration plan

Four of six planned runes should not be built. {% ref "WORK-500" /%} is the vehicle and
already exists; this spec is the reasoning it asks for. `cancelled` is the honest status
where the replacement is a documented composition with no work item of its own —
`superseded` requires a `supersedes` target, so it applies only if the adopting milestone
files one.

### D2 — `quiz` and `glossary` are permanent plugin runes, recorded so they are not revisited

`quiz` on a behavior *and* a custom content model; `glossary` on a `postProcess` that
rewrites other pages' prose. Same treatment {% ref "SPEC-148" /%} D3 gave `map`: stating
permanence stops the question being reopened each time the vocabulary grows.

### D3 — `prerequisite` is the first {% ref "SPEC-144" /%} consumer to build

Attribute-only, so it publishes before {% ref "SPEC-146" /%}; self-closing, so it has no
content model to get wrong; and greenfield, so there is no registry-identity gate to hold it
to. Every other candidate is a migration.

### D4 — `howto` adopts `list:ordered` / `list:unordered` regardless of composition

Not gated on anything in this series. It is a content-model correction that makes the rune
match its sibling, and it stands whether or not `howto` is ever composed.

### D5 — `recipe` is D15's reference case, as `event` is Problem 2's

Its `media-position="cover"` variant is a second assembly of the same slots. Any
multi-template implementation is checked against it, because it is the one instance where
the requirement was met by a different mechanism first and the difference is legible.

### D6 — `exercise`'s planned behavior is not needed for the part that matters

`details` covers the solution toggle natively. Only the sequential hint gate needs JS, and
that is a variant rather than the rune. If `exercise` is kept `pending` at all, it is kept
for the sequential variant and said so.

### D7 — the core/domain tier decides disposition, not the rune's shape

`stat` (WORK-005) is attribute-only and structurally trivial — the same profile as
`objective`. But it is a **core** rune, and {% ref "ADR-037" /%} routes first-party runes to
the declared emit path so a theme can rearrange them. So identical shapes get different
dispositions by tier, and the review pass must apply the tier test before the shape test.

### D8 — the pending items' "Transform Output" sections are stale, and saying so is cheap

One note per item, or one note on {% ref "SPEC-008" /%}. Either beats a future implementer
building the pre-{% ref "SPEC-130" /%} contract from a document that reads as current.

## Implementation notes, deliberately not yet work items

Kept here rather than filed, so the adopting milestone decides its own breakdown.

1. **Fix `howto`'s content model** (D4). Independent of everything else in this series and
   the smallest useful change the audit found.
2. **Feed {% ref "WORK-500" /%} the six dispositions** (D1), and annotate the stale
   "Transform Output" sections while the items are open anyway (D8).
3. **Compose `objective`** — the simplest composition available anywhere in the backlog,
   and a better first example for the authoring guide than any shipped rune.
4. **Compose `prerequisite` with {% ref "SPEC-144" /%}** (D3).
5. **Compose `howto`, then `recipe`** — recipe second, because `mediaImage` needs both
   SPEC-146 Problem 2 and SPEC-148's delimiter rule, and `ingredient` needs Problem 2 to
   preserve multiplicity.
6. **Leave `quiz` and `glossary`** (D2).

## Non-goals

- Deleting `plugins/learning/` — it stays, on `quiz` and `glossary` (D2)
- Implementing any pending rune; this spec dispositions them, it does not build them
- Performing {% ref "WORK-500" /%}'s pass over the seven non-learning pending items —
  D7's tier test applies to them, the per-rune judgement does not
- Deciding whether `postProcess` becomes declarable ({% ref "SPEC-144" /%} D2 and
  {% ref "SPEC-147" /%} own that question)
- Auditing `media` and `docs`

## Acceptance Criteria

- [ ] `howto`'s content model uses `list:ordered` / `list:unordered` and its transform no longer separates lists by node name, with `refrakt contracts --check` and `npm run seo:baseline:check` reporting no drift (D4)
- [ ] The six learning dispositions are recorded on their work items with a rationale, and {% ref "WORK-500" /%} names this spec as the judgment it used (D1)
- [ ] `objective` exists as a composition with a fixture, and appears in the authoring guide as the introductory example
- [ ] `prerequisite` exists as a composition whose edges resolve through `getRelated`, publishing correctly *before* SPEC-146 lands — asserted so the attribute-only claim cannot silently regress (D3)
- [ ] `concept` composes after SPEC-146 with `DefinedTerm`'s `name` and `description` publishing, and is verified alongside the other six `pageSectionProperties` cases ({% ref "SPEC-151" /%} D3)
- [ ] `recipe`'s `ingredient` publishes **all** its `<li>`s after SPEC-146 Problem 2, asserted on a six-ingredient fixture — multiplicity, not just reachability
- [ ] `recipe`'s `mediaImage` publishes from a composed tree whose template emits the media delimiter unconditionally ({% ref "SPEC-148" /%}'s rule), and an absent image yields no empty media zone
- [ ] Any multi-template implementation is checked against `recipe`'s `media-position="cover"` variant, producing the same assembled structure (D5)
- [ ] `plugins/learning/` is unchanged and passing its tests until an explicit decision, `howto`'s content-model fix aside
- [ ] Each pending {% ref "SPEC-008" /%} item carries a note that its "Transform Output" section predates {% ref "SPEC-130" /%} (D8)

## References

- {% ref "SPEC-008" /%} — the unbuilt runes; the six planned learning runes this dispositions
- {% ref "WORK-500" /%} — the retirement pass that asked for exactly this judgment
- {% ref "SPEC-145" /%} — composed runes; D2's no-behavior rule, D15's multi-template, D18's `card`
- {% ref "SPEC-146" /%} — name resolution; what gates `concept`, and whose Problem 2 fixture `recipe`'s `ingredient` extends
- {% ref "SPEC-144" /%} — entity and edge registration; `prerequisite` is its first greenfield consumer, and D2's `postProcess` exclusion is what `glossary` needs
- {% ref "SPEC-148" /%} — the places audit; the per-property method, the permanence precedent, and the delimiter rule `recipe` hits
- {% ref "SPEC-151" /%} — the marketing audit; the six-rune `pageSectionProperties` set both shipped runes belong to
- {% ref "SPEC-152" /%} — the plan audit; the third plugin that stays, against which this is the fourth
- {% ref "SPEC-147" /%} — the storytelling audit; the first witness that SPEC-144 D2's `postProcess` exclusion loses a capability
- {% ref "SPEC-091" /%} — `variants`; the mechanism `recipe` reached for in D15's absence
- {% ref "ADR-037" /%} — users author composed runes only; the tier test D7 turns on
- {% ref "ADR-036" /%} — the plugin escape hatch `quiz` and `glossary` fall under

{% /spec %}
