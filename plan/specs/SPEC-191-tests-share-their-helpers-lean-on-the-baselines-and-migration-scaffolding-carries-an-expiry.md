{% spec id="SPEC-191" status="draft" tags="tests, simplification, composition, seo, contracts" %}

# Tests share their helpers, lean on the baselines, and migration scaffolding carries an expiry

The test suite is about 88k lines across 467 files, plus an 11k-line snapshot. Most of it is real
coverage of distinct logic and stays. This spec targets three kinds of weight that aren't:
helpers every file writes for itself, assertions that restate what a generated baseline already
pins, and tests that exist only for the duration of a migration but have no way to say when that
is over.

## Why

**Every file writes its own helpers.**

- Nine `plugins/*/test/helpers.ts` files (601 lines) are the same apart from the plugin they
  import: places and business differ in exactly two lines. `packages/runes/test/helpers.ts` is a
  near-copy.
- 66 test files define their own tree walkers: `asTag` in 31, `findTag` in 12, `find` in 12,
  `findAllTags` in 11, `textOf`/`text` in 10, and more. There are 34 local `render` and 16 local
  `run` definitions; about 9 CLI tests each spawn the binary with their own `run()`, and 47 files
  hand-roll a temp directory.
- `t.attributes['data-rune'] === '…'` appears 615 times in test predicates. That's one helper
  call, `findRune(tree, 'badge')`, written out longhand.

**Some unit tests restate a baseline.** `contracts/seo-baseline/baseline.json`
({% ref "SPEC-130" /%}) pins the full JSON-LD for every emitting rune. Many cases in
`packages/runes/test/seo.test.ts` and `plugins/*/test/seo.test.ts` assert fields of the very
same fixture. For example, `plugins/storytelling/test/seo.test.ts:21-33` checks Veshra is a Person
with a `jobTitle`, which `fixtures/character.md` pins in full. Testimonial's JSON-LD is now
asserted three times: the marketing SEO test, `composed-testimonial.test.ts` and the baseline.

**Some tests are one table written as seven files.** The seven
`packages/lumina/test/*-preset.test.ts` files (~1,000 lines) each check that a preset stays out of
typography/structural/status roles, claims chrome + code-surface + syntax, and composes with
tideline, niwaki and lumina.

**Migration scaffolding has no end date.** The composition migration needs tests that compare a
composition against the native rune it replaces ({% ref "SPEC-147" /%} D2), tests that hold the
staging site equal to `main`, and policy tests over the staging convention. They are right while
the migration runs and dead after it, but nothing marks which is which:

- `packages/content/test/composed-{character,lore,bond,realm-faction}.test.ts`, the
  `composed-storytelling.ts` helper and its 19 fixtures: ~1,500–2,000 lines that die with the
  native storytelling runes. About 170 of those lines already only record spike findings about
  what a spec example "does not construct" (e.g. `composed-realm-faction.test.ts:549-662`).
- `staging-site.test.ts` and `staging-convention.test.ts` (~250 lines): dead once
  `site/staged-runes/` is empty.
- `composed-hero/cta/testimonial.test.ts` each keep a tombstone test asserting the native rune is
  gone, and still build a fixture copy of the plugin through `composed-marketing.ts` even though
  the runes are live.
- `imperative-schema-migration.test.ts` has `PENDING = {}`: its migration is finished, and what
  remains is a regex lint.

**Plan's equivalence snapshot is 11,089 lines.** `plugins/plan/test/emits-equivalence.test.ts`
was the {% ref "SPEC-143" /%} D7 gate for moving `work`, `bug` and `decision` to `emits`. That
migration is done. But its header says why it can't simply go: the SEO baseline doesn't cover
these runes and the structure contract is derived from config, so this snapshot is the *only*
thing that would notice a change in what their schemas build. It is so large because of
`JSON.stringify(out, null, 1)`.

## Decisions

### D1 — one test-utils module

A private workspace module (e.g. `packages/test-utils`, not published) exports:

- `makeRuneTestHelpers(plugin)`, which replaces the nine plugin `helpers.ts` files;
- tree walkers (`asTag`, `findTag`, `findAll`, `findRune`, `textOf`, `findByDataName`);
- `runCli(args, opts)` for the CLI tests and `withTempDir()`.

Files move to it as they are touched; a single sweep is a work item but not required before other
work. A lint test reports new local definitions of the exported names.

### D2 — a baseline-pinned fact is not asserted again

A unit test that asserts a field of a rune's structured data, where the SEO baseline has a fixture
for that rune with the same input, is removed. What stays is what the baseline can't express:
intent ("a character with a role becomes a Person"), defects the baseline records but a test wants
to see fixed, and inputs with no fixture. The same rule applies to BEM classes and data attributes
already pinned by `contracts/structures.json`.

### D3 — the preset tests are one table

The seven preset files become one `describe.each` over `{ preset, modes, extendedRoles }`, with
each preset's specific invariants (Solarized's symmetry, Gruvbox's warmth) kept as their own
cases.

### D4 — migration tests declare when they expire

A test that exists only for a migration carries a marker naming its exit condition:

```ts
describe.expires('storytelling goes live (WORK-682)', () => { … });
// or a header comment: `@expires <work-id>: <condition>`
```

`refrakt plan validate` (or a test) lists expiring tests whose named work item is `done`, so
going live includes deleting the scaffolding. Applied now:

- the storytelling comparisons and the `composed-storytelling` helper expire with the storytelling
  go-live;
- `staging-site.test.ts` and `staging-convention.test.ts` expire when `site/staged-runes/` is
  empty;
- the `steps` comparison (`composed-steps.test.ts:144-189`) and `plugins/marketing/test/steps.test.ts`
  expire with steps' go-live.

Deleted now: the ~170 lines of spike-finding tests, the three tombstone tests, and
`imperative-schema-migration.test.ts` (or reduced to the lint it actually is). The
`composed-hero/cta/testimonial` tests use the shipping `marketing` plugin and move to
`plugins/marketing/test`.

### D5 — the plan equivalence snapshot is replaced, not deleted

The snapshot keeps pinning what `work`, `bug` and `decision` build, in a form a reviewer can read:
the identity-transformed HTML per fixture input (as the SEO baseline's `rendered` channel does),
written as compact files. A change to the snapshot should be a reviewable diff; 11k lines of
indented JSON isn't one.

## Not in scope

- **Algorithmic tests with many distinct cases**: `resolver.test.ts`, `engine-core.test.ts`,
  `schema-table.test.ts`, `anchor.test.ts`, `plugin-validate.test.ts`, the plan CLI tests and
  behaviors. Their `it()` blocks test different logic; tabulating them would lose clarity.
- **The duplicate `structures.json`**, which is data, not a test ({% ref "SPEC-192" /%}).
- **`css-coverage.test.ts`'s stale allowlist** ({% ref "SPEC-192" /%}).

## Acceptance Criteria

- [ ] A private test-utils module exports the rune helpers factory, tree walkers, `runCli` and `withTempDir`
- [ ] The nine plugin `helpers.ts` files are replaced by `makeRuneTestHelpers(plugin)`
- [ ] SEO unit tests that restate a baseline fixture are removed, and every remaining case says what the baseline doesn't
- [ ] The seven preset tests are one table-driven test
- [ ] Migration-only tests carry an expiry marker, and a check lists those whose work item is done
- [ ] Spike-finding tests, tombstone tests and `imperative-schema-migration.test.ts` are removed
- [ ] The live marketing composition tests use the shipping plugin and live in `plugins/marketing/test`
- [ ] `emits-equivalence` pins rendered output in a compact, reviewable form, and the 11k-line snapshot is deleted

## References

- {% ref "SPEC-147" /%}: D2, the comparison tests D4 gives an expiry.
- {% ref "SPEC-181" /%}: the staging convention its policy tests hold.
- {% ref "SPEC-143" /%}: D7, the gate behind the plan snapshot.
- {% ref "SPEC-130" /%}: the SEO baseline D2 defers to.

{% /spec %}
