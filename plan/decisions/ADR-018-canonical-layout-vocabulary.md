{% decision id="ADR-018" status="proposed" date="2026-06-11" tags="layout,runes,vocabulary,architecture,carousel" %}

# Canonical layout vocabulary

## Context

Many runes expose an arrangement axis through a `layout` string attribute, and
the name is already universal — every rune that arranges its children uses
`layout`, never a synonym:

| Rune | `layout` values |
|------|-----------------|
| `gallery` | `grid` · `carousel` · `masonry` |
| `compare` | `side-by-side` · `stacked` |
| `cast` | `grid` · `list` |
| `blog` | `list` · `grid` · `compact` |
| `collection` | `list` · `grid` · `table` |
| `relationships` | `list` · `grid` |
| `comparison` | `table` |

The **attribute name** is consistent; the **values** are a zoo. The same concept
wears different spellings across runes (`compare`'s `side-by-side` is a `grid`;
its `stacked` is a single-column `list`), while genuinely rune-specific
arrangements (`masonry`, `table`) sit in the same flat enum as the cross-cutting
ones with no signal that they don't generalise. Each rune mints its own value set
in isolation.

This becomes a concrete problem the moment a value is meant to be **shared**.
`carousel` exists today only in `gallery`, implemented as a gallery-coupled
behavior (`[data-rune="gallery"]`, `rf-gallery__nav` chrome). We want it to become
a layout mode for several runes (`feature`, then `testimonial`, `pricing`,
`cast`, …). For that to be a config-and-CSS change per rune rather than a
behavior rewrite, `carousel` has to **mean the same thing and be spelled the same
way everywhere**, and it has to carry a shared DOM/behavior contract — not just a
shared label. Without a governing policy, three runes would each reinvent it with
drifting spellings.

There is an opposing failure mode too: a single flat enum that every rune must
draw from would force genuinely unique arrangements (`masonry`, `table`) to
either join a club they don't belong to or be banned. Neither is right.

## Options Considered

1. **One flat canonical enum; every rune subsets from it; no local values.**
   *Rejected.* Forces the genuinely rune-specific arrangements (`masonry`,
   `table`) into the shared set, where they carry no shared contract and confuse
   the meaning of "canonical." Either they pollute the pool or they're disallowed.

2. **Leave it as-is — each rune owns its `layout` values.** *Rejected.* This is
   the status quo that makes `carousel` non-portable: every adopting rune would
   reimplement it, spellings would drift, and the shared behavior could never bind
   block-agnostically.

3. **Two-tier vocabulary: a curated canonical pool + sanctioned per-rune local
   values, governed by a graduation rule.** *Chosen.* A rune's accepted `layout`
   values are the union of its picks from the canonical pool plus its own local
   values. Canonical tokens carry a shared contract; local tokens are rune-private
   with no shared machinery.

## Decision

1. **Two tiers, distinguished by contract — not popularity.**
   - **Canonical tokens** carry a shared *DOM/behavior contract*, not merely a
     shared word. `grid`, `list`, `carousel` are canonical: the same value implies
     the same emitted structure (e.g. `data-layout="carousel"` + the track/item
     contract) and the same behavior wherever it appears.
   - **Local tokens** are arrangements unique to one rune, with no shared
     machinery — `masonry` (variable-height media only), `table` (columnar data
     only). They live in the rune, not the shared set, *because* they don't
     generalise. Local values are sanctioned, not a smell.

2. **A rune's `matches` set is the union of its canonical picks + its local
   values.** A rune supports whatever subset of the canonical pool makes sense for
   it, and may append local values inline. No rune is required to support every
   canonical token.

3. **Graduation rule.** A value enters the canonical pool when a **second** rune
   needs the same concept *with the same contract*. Until then it stays local.
   This guards both failure modes: premature abstraction (a pool full of one-offs)
   and no abstraction (three runes reinventing the same concept). `carousel`
   graduates **now** — it already has 3+ identified consumers
   ({% ref "SPEC-100" /%}).

4. **Canonical tokens are a single shared const.** Runes import the canonical
   tokens from one place (e.g. `LAYOUT.grid`, `LAYOUT.carousel`) rather than
   re-typing the string, so spelling cannot drift and importing a token implies
   its contract. The seed set is `grid`, `list`, `carousel`. Each rune's
   `matches:` array is built from these picks plus any local string literals.

5. **No forced migration.** Existing runes are **not** eagerly rewritten to the
   canonical spellings. `compare`'s `side-by-side`/`stacked`, `blog`'s `compact`,
   etc. stay as-is until something else touches that rune — lazy graduation,
   consistent with rule 3. When a rune is next worked on, private spellings of a
   canonical concept *should* be migrated (with deprecations) to the canonical
   token; genuinely local values are left alone.

## Rationale

- **Portability is the whole point.** A canonical token that implies a contract is
  what lets `carousel` move from `gallery` to `feature` to `testimonial` as a
  config-and-CSS change with zero new behavior code each time. The shared const
  makes the spelling un-driftable; the contract makes the behavior bindable
  block-agnostically.
- **The two-tier split respects reality.** Some arrangements genuinely generalise
  and some genuinely don't. Forcing `masonry`/`table` into a shared pool, or
  banning them, would both be wrong; sanctioning local values keeps the pool
  *meaningful* (everything in it carries a contract) without amputating the
  outliers.
- **The graduation rule is the load-bearing guardrail.** It is the same
  "fixed vocabulary, earn your place" discipline {% ref "ADR-015" /%} applies to
  scale ramps, one level up: the pool only grows when a concept has *proven* it
  generalises by acquiring a second consumer.
- **Lazy migration avoids a big-bang spec.** The existing outliers carry no
  urgency; rewriting them all at once would be churn for its own sake. Migrating
  opportunistically as runes are touched keeps the change cost proportional to the
  work actually happening.

## Consequences

- **Enabling work:**
  - Add a canonical-token const (the seed set `grid`, `list`, `carousel`) in a
    shared location the rune schemas can import (`packages/runes`).
  - Document the two-tier model + graduation rule in the rune-authoring guide so
    new runes pick from the pool rather than minting private values.
- **`carousel` carries a contract, defined by {% ref "SPEC-100" /%}.** The shared
  track/item DOM contract + the generalised, contract-bound behavior are specified
  there; this ADR only establishes that a canonical token *has* such a contract.
- **{% ref "SPEC-099" /%} is the first consumer of the pool.** `feature` draws
  `grid` and `list` from the const (no bespoke values), proving the subset model
  before `carousel` lands.
- **Existing runes keep working unchanged.** No selector or value changes ship
  until a rune is independently revisited; CSS-coverage and structure contracts
  are unaffected by this decision on its own.
- **Tooling:** `refrakt inspect` and the structure contracts continue to derive
  `data-layout` variants per rune from that rune's declared `matches`; the
  canonical const changes where the strings *come from*, not how many a given rune
  declares.
- **Authoring guidance (new invariant):** a private spelling of a canonical
  concept is a defect to be fixed when next touched; a genuinely unique
  arrangement is a legitimate local value. The graduation rule is the test for
  which is which.

{% /decision %}
