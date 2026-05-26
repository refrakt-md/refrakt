{% decision id="ADR-012" status="proposed" date="2026-05-26" source="SPEC-070" tags="plan, collection, runes, deprecation, ordering" %}

# Collapse backlog and decision-log onto collection

## Context

{% ref "SPEC-070" /%}'s `collection` rune now does, generically and more flexibly, what the plan plugin's `backlog` and `decision-log` runes do bespokely. Their resolvers (`resolveBacklog` pipeline.ts:612, `resolveDecisionLog` pipeline.ts:775) already call the *same* `parseFilter`/`matchesFilter`/`sortEntities`/`groupEntities` machinery — they are `collection` with a few domain defaults bolted on, and *less* capable than it:

- **backlog** = `filter` + `sort` (default `priority`) + `group` + `show` (default `all` → work+bug) + `limit`. No body template, no `layout`, no `card` chrome.
- **decision-log** = `filter` + `sort` (default `date`) over `decision` entities, rendered as a fixed `<ol>` via `buildDecisionEntry`.

So each is collection-minus-flexibility, plus a couple of presets, implemented as a fully parallel path: two extra `postProcess` sentinels + branches, two bespoke renderers, separate CSS, tests, and doc pages — all duplicating collection's pipeline. {% ref "ADR-011" /%} already moves the *milestone* backlog onto `collection`; these are the standalone siblings of that same move.

`collection` reaches functional parity for everything except one thing: **domain-aware ordering**. There are two separate `sortEntities`/`groupEntities` — collection's (`collection-resolve.ts:74`, generic lexical/numeric) and the plan plugin's (`filter.ts:24`), which carries `PRIORITY_ORDER` (filter.ts:20) and a per-type status group order (pipeline.ts:805). `sort="priority"` in plain collection would sort *alphabetically* (wrong); status groups would appear in encounter order, not the intended dashboard order. Closing that gap is the real prerequisite; the rest are presets and presentation.

## Options Considered

### 1. Status quo — keep both bespoke runes

**Pros:** zero churn; existing content and downstream tools (Trace) untouched.

**Cons:** two aggregation paths for one job; the bespoke one is rigid (no template/layout/card) and duplicates collection's pipeline, CSS, tests, and docs — a standing maintenance burden that grows every time collection gains a feature these don't.

### 2. Hard-deprecate and remove — migrate content to `collection`

Delete the runes; rewrite every `{% backlog %}` / `{% decision-log %}` in content as a `collection`.

**Pros:** single mechanism, smallest end-state surface.

**Cons:** breaks existing plan content and third-party consumers (Trace); needs a migration codemod/recipe; throws away a genuinely convenient zero-config preset for no real gain over keeping a thin alias.

### 3. Collapse onto `collection`, keep the tags as thin sugar — **chosen**

Separate the **surface** (the `{% backlog %}` / `{% decision-log %}` tag + its defaults — convenient, cheap to keep) from the **implementation** (the parallel resolver/renderer/CSS — the actual burden). Delete the implementation; reimplement the tags as thin sugar that lowers to a `collection` query.

**Pros:**
- Removes the duplicated pipeline/rendering/CSS/tests — the real maintenance cost.
- Existing content keeps working; **no migration**, no Trace breakage.
- One code path (collection's) for all plan aggregation; authors who want more (layout, cards, custom columns) reach for `collection` directly.
- Forces the one missing collection capability — domain-aware ordering — which benefits *every* collection, not just plan.

**Cons:**
- The sugar still carries a little plan-domain knowledge (the `all`→`work,bug` expansion, the default sort/group). Acceptable: it lives in the plan plugin, where that knowledge belongs.
- Depends on the ordering capability landing first.

## Decision

Adopt option 3.

1. **Reimplement `backlog` / `decision-log` as thin sugar over `collection`.** Each lowers to a `collection` query: map `show`→`type`, expand `all`→`work,bug` (plan-domain knowledge in the sugar), apply the preset defaults (`backlog`: `sort=priority`; `decision-log`: `type=decision`, `sort=-date`), and use a shipped plan card/entry **partial** as the default template so the rendered result matches today. Delete `resolveBacklog`/`resolveDecisionLog`, their sentinels, the bespoke renderers, and the dedicated CSS.

2. **Add domain-aware ordering to `collection` (the enabling parity item).** Sort and group consult plugin-registered orderings:
   - **Keyed by `(type, field)`**, never `field` alone — `work.status`, `spec.status`, and `milestone.status` are different enumerations, and cross-domain (e.g. a storytelling `status`) would otherwise collide.
   - **Default order is derived from the rune schema's `matches` array** for that `(type, field)` (it is already an ordered, per-type list — the existing source of truth), with an **explicit per-`(type, field)` override** for the cases where presentation order differs from declaration order (e.g. a status dashboard wants actionable-first, not lifecycle order).
   - **Unregistered `(type, field)` falls back** to collection's existing generic lexical/numeric sort.
   - **Mixed-type queries use rank-normalization:** resolve each entity's value to its index within *its own* `(type, field)` ordering, then sort by that integer rank and order groups by their representative rank. Homogeneous queries are the degenerate case; cross-type sets compose naturally (all earliest-stage items cluster regardless of type), and same-value groups merge.
   - **De-duplicate:** delete the plan plugin's `filter.ts` `sortEntities`/`groupEntities`; the plan plugin instead *registers* its orderings (where they diverge from `matches`) into collection's shared sort/group.

3. **Default chrome via shipped partials.** Reuse the existing `work-card` partial for backlog; add a `decision-entry` partial for decision-log. Status/priority/severity badge styling already comes from the plan rune config (config.ts:74/81/123), so the lowered output keeps its look. The decision-log `<ol>` semantics are not preserved (collection's items container is a `div`); judged a minor, acceptable loss.

4. **Gate the change** on: (a) the ordering capability shipped and verified; (b) the plan-site dogfood rendering backlog/decision-log views via the lowered `collection` (it already renders work via `collection`); (c) a short migration note. No deprecation warning is emitted while the sugar remains a supported alias.

## Rationale

`backlog`/`decision-log` are exactly the kind of rigid, domain-defaulted aggregators that `collection` was designed to subsume — the same argument that killed per-entity `*-card` runes earlier in this arc. The maintenance cost is the *parallel implementation*, not the tag, so deleting the implementation while keeping a ~15-line alias removes the burden without the breakage of a hard deprecation. The one genuine capability gap — domain-aware ordering — is worth building regardless: it is a general `collection` improvement, it eliminates a duplicated sort/group implementation, and `(type, field)` keying with `matches`-derived defaults means most orderings cost nothing to register while collection stays domain-agnostic.

## Consequences

**For `@refrakt-md/plan`:**
- Replace the `backlog`/`decision-log` schemas' bespoke resolution with thin lowering to `collection`; delete `resolveBacklog`/`resolveDecisionLog`, their sentinels, and the dedicated CSS.
- Delete `filter.ts` `sortEntities`/`groupEntities`; register plan's enum orderings (only where they diverge from each rune's `matches`) into collection's shared ordering.
- Ship `work-card` (exists) and a new `decision-entry` partial as the sugar's default templates.

**For `@refrakt-md/runes` + `@refrakt-md/content` (core):**
- `collection` sort/group gain a `(type, field)`-keyed ordering lookup: schema-`matches`-derived default, explicit override, lexical/numeric fallback, rank-normalization for mixed-type sets. Thread the merged plugin orderings through the pipeline to the collection resolver (as `embedConfig` is threaded).
- This ordering capability is general — `relationships` (ADR-011) and any future aggregator benefit; it likely warrants its own implementation spec.

**For the plan-site dogfood:**
- backlog/decision-log views render through the lowered `collection`; prove parity here before removing the bespoke path.

**For authors and third parties (Trace):**
- No content migration — `{% backlog %}` / `{% decision-log %}` keep working as aliases. Anyone wanting layout/card control uses `collection` directly.

**Open follow-up:**
- An implementation spec for collection's domain-aware ordering (`(type, field)` registry, `matches` derivation, override format, rank-normalization). Shared with the ADR-011 relationship-graph work.
- Decide whether to ever emit a deprecation notice on the aliases, or keep them indefinitely as supported sugar.
- The `<ol>` semantic loss for decision-log — revisit if an ordered-list affordance for `collection` is wanted.

{% /decision %}
