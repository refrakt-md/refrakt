{% spec id="SPEC-124" status="accepted" tags="engine, transform, architecture, refactor, dx" %}

# Facet registry for the identity transform's universal axes

`transformRune` in `packages/transform/src/engine.ts` resolves every universal
rune axis — tint, density, width, spacing, reading, elevation, prominence,
motion, background, frame, substrate, cover — in one 800-line function whose
steps are numbered `1, 1b, 1c … 1h, 2 … 9`. The lettering is the fossil record:
each new axis was wedged between two existing ones rather than added alongside
them. This spec replaces that section with a **facet registry** — one module per
axis, declared dependencies, and a driver that merges their contributions.

The engine's own comments already call these axes *facets* ("SPEC-105 motion
facet", "the scrim facet", "resolve the frame preset + facets"). The concept
exists in the prose and has no representation in the code. So does the
decomposition: 18 of the ~50 files in `packages/transform/test/` are already
named after individual axes (`elevation.test.ts`, `cover.test.ts`,
`bg-gradient.test.ts`, …). The tests found the seams years before the source
did.

## Problem

`engine.ts` is 2192 lines — a quarter of the package — and `transformRune` is
~800 of them. Concretely:

- **Ordering is implied by statement adjacency.** `dropcap` is valid only on a
  prose `reading` register; the constraint holds because `reading` happens five
  lines earlier. `cover` publishes `isCover` at one line and consumes it at
  seven call sites up to 600 lines away. Nothing declares or enforces any of it.
- **Vocabularies are stranded from their use.** `ELEVATION_VALUES` sat 600 lines
  from the code that resolves elevation — and was never read at all, a
  spec-defined closed set that nothing enforced. The engine's `HEADER_SECTION_ROLES`,
  `CHIP_METATYPES`, `FRAME_FACET_META` and `TINT_TOKENS` are the same shape.
- **Warn-once is copy-pasted eight times.** Eight module-level `const X_WARNED =
  new Set()` blocks with identical guard-add-warn bodies. Because they are
  module scoped, a warning fires once per *process*: in a long-lived dev server
  an author sees a diagnostic once and never again, across every later edit and
  every other page. The dedupe state is also unreachable from tests.
- **Adding an axis means editing a shared 800-line scope**, where the new axis
  can silently interact with any of the eleven already there.

The 630 existing transform tests all run through `createTransform` — the public
entry point — and assert on output attributes and classes. They are agnostic to
the engine's internal structure, which makes them a usable characterization
suite for exactly this change.

## Design

### The facet interface

A facet reads a read-only context and returns its contributions as data. The
driver merges them into the accumulators `transformRune` already maintains.

```ts
interface Facet {
	readonly name: string;
	readonly after?: readonly string[];
	appliesTo?(ctx: FacetContext): boolean;
	resolve(ctx: FacetContext): FacetResult | null;
	postAssemble?(ctx: FacetContext, children: RendererNode[]): void;
}

interface FacetResult {
	axes?: Record<string, string>;   // emitted as data-* + `config.styles` lookup key
	state?: Record<string, string>;  // cross-facet only, never emitted
	classes?: string[];
	dataAttrs?: Record<string, string>;
	styles?: FacetStyle[];           // ordered [prop, value] pairs
	consumes?: string[];             // meta fields stripped from output
	layers?: FacetLayer[];
	warnings?: FacetWarning[];
}
```

Four properties of this shape were **corrected by prototyping against the
hardest case** (cover/scrim, {% ref "SPEC-089" /%}) rather than designed up
front. They are recorded here because each was wrong in the first draft:

1. **`state` is separate from `axes`.** Emitted axes become `data-*`
   attributes. Publishing "this rune is in cover mode" through `axes` would
   invent a `data-cover` attribute on every cover rune. Emitted output and
   internal resolution state are different channels that happen to share a
   reader (`ctx.axis()`).
2. **`styles` is an ordered pair list, not a `Record`.** `cover` deliberately
   re-declares `--cover-scrim-dir` after `content-place` has set it, relying on
   CSS last-wins — the override two comments describe in prose. A keyed map
   collapses the two declarations into one and changes what renders, with no
   test to catch it.
3. **`postAssemble` is required, not a convenience.** Cover's foreground-polarity
   flip mutates the assembled `content` overlay, which does not exist when
   `resolve` runs. A single axis can contribute at two different pipeline
   phases, so facet ≠ one contribution point.
4. **Dependencies must be able to name un-migrated producers.** `media-position`
   comes from the generic config-modifier loop, which stays inline until late in
   the migration. Without a declared seed surface, no facet can depend on it and
   incremental migration is impossible — it becomes all-or-nothing.

### Declared ordering

`after` names a facet **or a seeded axis**; `orderFacets` topologically sorts,
keeps registration order for independents, and throws at import on a cycle, a
dangling reference, or a duplicate name. Ordering constraints that were
previously invisible become checkable:

```ts
export const coverFacet: Facet = {
	name: 'cover',
	after: ['media-position', 'content-place'],
	// …
};
```

That `after` encodes the rule the code states only in a comment — *"an explicit
scrim direction pins the default-scrim gradient, overriding the
content-place-derived direction set above"* — so it survives someone reordering
statements.

### Seeded axes — migration scaffolding

`FacetInput.seedAxes` carries values still resolved inline. Facets read them
through the same `ctx.axis()` channel they will use once the producer migrates,
so **consumers need no edit when it does**: a facet-supplied value shadows the
seed of the same name. Seeds are readable but never emitted (the engine's own
accumulators already carry them). Each entry is deleted as its producer
migrates; the last removal is part of retiring the generic modifier loop.

### Warnings as data

Facets return `FacetWarning[]` instead of calling `console.warn`. The driver's
`WarningCollector` owns emission and per-key dedupe, giving one dedupe point
instead of eight module-level sets, and making diagnostics assertable without a
console spy. Emission stays immediate so console ordering is unchanged.

Dedupe **scope** is deliberately preserved as process-wide for now — matching
the `*_WARNED` sets — and revisited as its own work item, because narrowing it
to per-build or per-page is a behaviour change authors will notice.

### Vocabularies move with their facet

Each facet owns the closed set it validates against and exports it as the
public vocabulary: `ELEVATION_VALUES` and `PROMINENCE_VALUES` now live beside
the code that reads them. This is the answer to "constants mixed in with logic"
for the *vocabulary* class of constant.

It is **not** the answer for the other class. `SUBSTRATE_CELL` (`12px/16px/24px`),
`SUBSTRATE_OPACITY`, `SCRIM_STRENGTH` (`0.3/0.55/0.8`) and `BLUR_PRESETS` are
theme decisions hard-coded into a framework-agnostic engine — the engine breaks
the rule every CSS file in the repo must follow. Hoisting them into a shared
constants module would entrench that by making it look intentional. They should
become token references, which is out of scope here and noted as follow-on work.

## Scope

- The facet interface, driver (ordering, merge, two-phase, warning collector)
  and registry in `packages/transform/src/facets/`.
- Migration of every universal axis currently resolved inline in
  `transformRune`, in dependency order.
- Retirement of `seedAxes` once the generic config-modifier loop is itself a
  facet.
- Consolidation of the eight `*_WARNED` sets onto the collector, and a decision
  on dedupe scope.
- Investigation of whether structure contracts can be derived from facets
  instead of re-derived independently (see *Open questions*).

## Non-Goals

- **No output changes.** Every migration is behaviour-preserving: identical
  attributes, classes, inline styles, and warning strings.
- **No test rewrites.** See *Verification*.
- **Not the assembly pipeline.** Steps 4–6 of `transformRune` (auto-label, block
  assembly, BEM application, recursion) are not facets and are untouched.
- **Not the theme-value extraction.** Moving `SCRIM_STRENGTH` and friends to
  design tokens is real work this spec argues for but does not cover.
- **Not the package split.** `packages/transform` also holds i18n, token
  stylesheet generation, HTML rendering, adapters and a Vite plugin. That
  cohesion problem is real and separate.

## Verification

The 630 pre-existing transform tests are the safety net, and the governing rule
is: **not one of them changes.** They run through the public entry point and
know nothing of the engine's internals, so if a test needs editing to
accommodate a migration, the edit is the bug report — behaviour drifted.

Each work item must additionally hold: `npm run build`, the full repo suite, and
`refrakt contracts --check` (config-derived, so it must stay byte-identical).

New unit tests cover surface that has no counterpart today: facets in isolation
without `ThemeConfig` scaffolding, the driver's new failure modes (cycles,
dangling `after`, duplicate names), the two-phase and seeding channels, and
warning dedupe — previously unassertable because the `*_WARNED` sets were
module-level and unresettable.

A caveat worth stating: passing facet unit tests can coexist with broken
*composition* — cover/scrim is precisely a bug that would live in the
interaction, not in either facet. Unit tests are additive diagnostics, not a
replacement for the integration suite, and are never grounds for relaxing the
rule above.

### Releasing

Each implementation PR carries a **patch** changeset. Nothing here changes the
public API — `facets/` is not exported from the package index — so a patch is
the correct semver step, and the milestone is a patch release (`v0.30.1`).

The changeset is not bookkeeping. This restructures the code path every rune
renders through, so a regression that escapes the 630 tests reaches consumers.
A changelog entry naming which axes moved in which version is what someone
bisecting a rendering regression needs. Refactors of critical paths are worth
recording *because* they carry risk, not exempt from it because they add no API.

Landing with no changesets at all would also strand the spec: with nothing
published, SPEC-124 could reach `implemented` but never `shipped`, since that
status requires a real `released-in` version.

## Acceptance Criteria

- [ ] Every universal axis in `transformRune` resolves through the facet registry
- [ ] `after` declares each cross-axis dependency; cycles, dangling references and duplicate names throw at import
- [ ] `seedAxes` is empty and the type is removed
- [ ] The eight `*_WARNED` sets are gone; all facet diagnostics flow through the collector, with dedupe scope deliberately chosen and documented
- [ ] Each facet owns and exports the vocabulary it validates against
- [ ] All 630 pre-existing transform tests pass **unmodified** at every step
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass at every step
- [ ] `transformRune` no longer contains lettered sub-steps (`1b`…`1h`)
- [ ] Each implementation PR carries a patch changeset naming the axes it migrated
- [ ] Theme values still hard-coded in the engine are inventoried and filed as follow-on work

## Open questions

- **Can structure contracts derive from facets?** `contracts.ts` independently
  re-derives what the engine emits, from config — it imports `types`, `helpers`
  and `merge`, never the engine. So `contracts --check` validates contracts
  against themselves, not against engine output, and any engine change contracts
  does not mirror produces confidently wrong contracts with CI green. A facet
  `describe(config)` returning its static contract contribution would collapse
  the two implementations. This is **untested** — `describe` cannot simply call
  `resolve` (contracts are config-only, with no instance), so it is a genuinely
  separate method that could drift the same way. Prototype it on two or three
  facets before committing.
- **What dedupe scope should warn-once have?** Process-wide is the current
  behaviour and is preserved by default, but it makes diagnostics effectively
  invisible after the first occurrence in a dev server.
- **Does `layers` survive the background facet?** The channel is declared but
  unexercised; bg is the first facet that builds its own element tree.

## References

- {% ref "SPEC-107" /%} — elevation & prominence, the first two axes migrated
- {% ref "SPEC-089" /%} — cover layout; the coupling the interface was corrected against
- {% ref "SPEC-088" /%} — bg gradients and the scrim vocabulary
- {% ref "SPEC-086" /%} — frame presets, whose chrome targets the media zone post-assembly
- {% ref "SPEC-087" /%} — substrate fills, same post-assembly targeting
- {% ref "SPEC-053" /%} — tint vocabulary
- {% ref "SPEC-108" /%} — reading register and the dropcap capability gate
- {% ref "SPEC-091" /%} — config variants, resolved before the facet pass runs

{% /spec %}
