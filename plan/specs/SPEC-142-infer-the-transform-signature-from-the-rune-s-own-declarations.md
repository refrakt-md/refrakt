{% spec id="SPEC-142" status="draft" tags="runes, types, dx, architecture" %}

# Infer the transform signature from the rune's own declarations

`transform(resolved, attrs, config)` is the one place a rune does real work, and
both of its interesting parameters are untyped:

```ts
transform: (resolved: ResolvedContent, attrs: Record<string, any>, …)
```

`attrs.nmae` is not merely unchecked — it is `any`, so it poisons everything
downstream. `ResolvedContent` is `{ [fieldName: string]: ResolvedField }` where
`ResolvedField` unions with `unknown` and collapses to it, so
`resolved.anythingWhatsoever` is legal on all 121 runes.

**Nothing new needs to be declared.** `required: true`, `matches: [...]`,
`name: 'body'`, `greedy: true`, `optional: true` are already written in every
rune. `ContentModelSchemaOptions` widens them away. Make the builder generic
with `const` type parameters (TS 5.0+; the repo is on 5.9.3) and the types fall
out of declarations that already exist.

Prototyped and measured in `spike/rune-typing/` — machinery, compiling cases,
self-asserting negatives, and a compile-time benchmark. `node check.mjs`.

## Problem

Four costs, in rough order of how much they hurt:

**Typos are silent.** A misspelled attribute or resolved field is `any` /
`unknown`, never an error.

**Shape assumptions are invisible.** `resolveSections` returns *two*
structurally different things from one model type — `Ast.Node[]` when `emitTag`
is set (`resolver.ts:502`), and resolved entries carrying `$heading`,
`$canonicalName` and the recursed body when it is not (`:536`). The runes split
6/8 on this. Nothing in the types says which you have.

**Consumers re-assert by hand what the model already declares:**

```ts
// plugins/plan/src/util.ts:27
export function buildSections(sections: any[], config: any): any[] {
	const headingText = section.$heading as string;
	const canonicalName = section.$canonicalName as string | undefined;
	const canonicalSlug = section.$canonicalSlug as string | undefined;
```

**Enumerations decay to `string`.** `$canonicalName` is one of the rune's
declared known-section names or `undefined`. Read as `string | undefined`, a
comparison against a typo — or against a section name another rune declares —
is a silent no-op.

## What the spike settled

| Case | Verdict |
|---|---|
| Attributes: required/optional, `matches` → union, `base` merge, the `.slice()` idiom | infers |
| `sequence`: field names, `greedy` → array, `optional` → `\| undefined` | infers |
| `sections` **with** `emitTag` → `Node[]` | infers |
| `sections` **without** `emitTag` → entries, recursing into `sectionModel` | infers |
| `delimited` + `dynamicZones` → recursing into `zoneModel` | infers |
| `knownSections` → `$canonicalName` as a literal union | infers |
| `knownSections` with a per-section `model:` | infers; **message is bad** |
| `custom`, `headingExtract` | opaque — unchanged from today |

The worry going in was that content models would be hard: four kinds, and they
nest. Both halves were wrong. Recursion costs nothing structurally —
conditional types recurse — and the variety maps to a conditional chain. The
difficulty is one optional field that changes a return shape (`emitTag`) and one
override nobody uses (`model:`).

## Decisions

### D1 — generics with defaults, not decorators

Decorators or a model class would move the declaration out of plain-object land.
`refrakt inspect`, `refrakt contracts`, the rune catalog and the attribute
reference all read these schemas as **runtime data**; decorator metadata is
harder to reflect over and serialise than an object literal. The plain-object
form is load-bearing, and the information is already in it.

### D2 — the generic defaults must be `Record<never, never>`

Not `Record<string, never>`, which carries a string index signature: with it,
any rune omitting `base`/`attributes` type-checks every attribute access and the
feature silently does nothing. The spike caught this mid-flight — three
expectations stopped firing while the `resolved` ones kept working, which is
exactly how this would ship looking like a success. A regression test covers it.

### D3 — adoption is incremental, one plugin at a time

With D2's defaults, an untouched rune keeps today's loose types. No cutover,
no flag day. Start with `plugins/learning` (2 runes, both plain `sequence`),
then re-measure before going wider.

### D4 — the 12 thunked content models gain `as const`; nothing else changes

`const` type parameters do not reach through a function's return type, so
`contentModel: () => ({…})` widens `optional: true` to `boolean` and loses
field-level inference. One trailing `as const` fixes it, replacing the two or
more inner `as const`s those files already carry. The other 106 content models
need no call-site change at all.

### D5 — `custom` and `headingExtract` stay opaque

`processChildren` is an arbitrary function (14 runes) and `headingExtract`
derives keys from a runtime pattern. Both keep today's loose type. That is not a
regression, and template-literal gymnastics for `headingExtract` would not pay
for themselves.

### D6 — consider removing `KnownSectionDefinition.model`

It is the only case where the inferred type is unpleasant rather than merely
verbose: the error inlines the whole model, truncated, and neither a named
`SectionEntry<M>` alias nor hoisting the model to a named const improves it
(both tried in the spike). **No rune declares one.** Deleting an unused feature
is cheaper than carrying its debugging cost. Not required by this spec — the
type is correct either way — but the two should be decided together.

### D7 — the benchmark is re-run against the real tree before the last plugin lands

The spike's `+20–28%` is 121 runes in the heaviest shape, against a synthetic
file. The real mix is 87 `sequence`, 13 `sections`, 3 with `knownSections`, so
the true figure should be lower — but this is a library whose types consumers'
builds instantiate too, and a synthetic benchmark is not evidence about their
builds.

## Non-goals

- Changing the authoring format. No decorators, no model class, no new fields
- Changing any rune's runtime behaviour, output, or the resolver
- Typing `config` (the Markdoc `Config`) or the `node` parameter
- Making inference mandatory — D3 requires the loose path keep working
- Inferring `custom` models (D5)

## Acceptance Criteria

- [ ] `createContentModelSchema` is generic over `base`, `attributes` and `contentModel`, with `const` type parameters
- [ ] `attrs` resolves required attributes as present, optional as `| undefined`, `matches` as a literal union, and `String`/`Number`/`Boolean` as their primitives
- [ ] `resolved` resolves `sequence` field names, with `greedy` as an array and `optional` as `| undefined`
- [ ] `resolved.sections` is `Node[]` when `emitTag` is declared and resolved entries when it is not
- [ ] A section entry's body type recurses through `sectionModel`, and a `delimited` zone's through `zoneModel`
- [ ] `$canonicalName` is the literal union of the rune's declared known-section names
- [ ] The generic defaults are `Record<never, never>`, with a regression test that a rune declaring no attributes still rejects an unknown one (D2)
- [ ] A rune that has not been migrated compiles unchanged against the loose types (D3)
- [ ] The 12 thunked content models carry `as const` on the returned object; the other 106 are untouched (D4)
- [ ] `custom` models resolve to the loose type, with no error (D5)
- [ ] `spike/rune-typing/check.mjs` passes against the shipped types, not just the prototype
- [ ] `buildSections` (`plugins/plan/src/util.ts:27`) drops its `any[]` parameter and its six hand-written casts
- [ ] Compile time is measured on the real tree before the final plugin migrates, and recorded (D7)
- [ ] The rune authoring guide documents what is inferred, what stays opaque, and the `as const` rule for thunked models

## References

- `spike/rune-typing/` — the prototype, cases, negatives and benchmark this spec rests on
- {% ref "SPEC-140" /%} — the transform boilerplate survey; same surface, independent change
- {% ref "SPEC-125" /%} — the join tables a rune declares about itself; the same "the rune already said this" principle
- {% ref "ADR-008" /%} — the flat namespace `properties` and `refs` share, which the inferred types must keep enforcing

{% /spec %}
