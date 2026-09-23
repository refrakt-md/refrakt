# Typing `transform(resolved, attrs)` — what the declarations already know

A throwaway spike, run to settle one question with a compiler rather than
argument: **can the `transform` signature be typed from the declarations a rune
already writes, without a new declaration mechanism?**

The starting worry was that content models would be the hard part — there are
four kinds and they nest. That turned out to be wrong in both directions, and
the corrections are the point of this spike.

```bash
node check.mjs          # compile every case; positives clean, negatives assert
node check.mjs --show   # …and print the real error messages
node bench.mjs [n=121]  # compile-time cost, worst-case shape
```

`infer.ts` holds the machinery. `cases/` must compile clean. `negative/` uses
`@ts-expect-error`, so those files **also** compile clean — but only while every
expected error still fires. If inference regresses, the directive goes unused
and `tsc` fails. That is the assertion; there is no separate expectation file.

`Node` is the real `@markdoc/markdoc` AST node, and `cases/03` is
`plugins/plan/src/tags/work.ts`'s declaration verbatim.

## Result

| Case | Verdict |
|---|---|
| Attributes: required/optional, `matches` → union, `base` merge, `.slice()` idiom | infers |
| `sequence` fields: names, `greedy` → array, `optional` → `\| undefined` | infers |
| `sections` with `emitTag` → `Node[]` | infers |
| `sections` without `emitTag` → resolved entries, recursing into `sectionModel` | infers |
| `delimited` + `dynamicZones` → recursing into `zoneModel` | infers |
| `knownSections` → `$canonicalName` as a literal union | infers |
| `knownSections` with a per-section `model:` | infers, **but the message is bad** |
| `custom`, `headingExtract` | opaque — unchanged from today |

## The declarations already say everything

Nothing is missing from the current authoring format. `required: true`,
`matches: [...]`, `name: 'body'`, `greedy: true`, `optional: true` are all
already written down. `ContentModelSchemaOptions` widens them to
`Record<string, SchemaAttribute>` and `ContentModel`, which throws the literals
away; `transform` then receives `Record<string, any>` and an index signature
over `unknown`.

So this needs no decorators and no model class. `const` type parameters
(TS 5.0+; the repo is on 5.9.3) preserve what is already there. **106 of 118
content models need no call-site change at all.** The 12 written as
`contentModel: () => ({…})` need `as const` on the returned object, because
`const` type parameters do not reach through a function's return type — and
those files already carry two or more inner `as const`s that it replaces.

## The two surprises

**1. `emitTag` is a discriminant, and nothing says so today.**
`resolveSections` returns two structurally different shapes from one model type
— `Ast.Node[]` when `emitTag` is set (resolver.ts:502), resolved entries with
`$heading` / `$canonicalName` / the recursed body when it is not (:536). The
runes split 6/8 on this. Both arrive as `unknown`, so nothing distinguishes
them, and the no-`emitTag` consumers cope by casting:

```ts
// plugins/plan/src/util.ts:27
export function buildSections(sections: any[], config: any): any[] {
  const headingText = section.$heading as string;
  const canonicalName = section.$canonicalName as string | undefined;
  const canonicalSlug = section.$canonicalSlug as string | undefined;
```

Six hand-written casts re-asserting what the content model already declares.

**2. `knownSections` is the biggest payoff, not the hard part.**
Because the keys are literals, `$canonicalName` narrows to the declared union:

```
error TS2367: This comparison appears to be unintentional because the types
'"Acceptance Criteria" | "Approach" | undefined' and '"Acceptence Criteria"'
have no overlap.
```

Both negatives in `negative/03` are silent no-ops today — a typo, and a section
name that belongs to `bug` but not `work`. Neither can match; neither warns.

## The one genuinely awkward corner

`KnownSectionDefinition.model` lets a known section override the body model.
**No rune declares one** — `work`, `bug` and `decision` use `alias` (plus
`canonicalSlug` / `i18nAliases`) only. Forced in `negative/04`, the type is
*correct*: `body` exists on the fallback branch and not on the override, so
reading it unconditionally is a real bug. The message is the problem:

```
error TS2339: Property 'body' does not exist on type 'SectionEntry<{ readonly
type: "sections"; readonly sectionHeading: "heading:2"; readonly sectionModel:
{ readonly type: "sequence"; readonly fields: readonly [{ readonly name: …
```

The whole inferred model, inlined and truncated. Two mitigations were tried and
**neither works**: extracting a named `SectionEntry<M>` alias (the name appears,
the giant type argument still does), and hoisting the model to a named const so
it would print as `typeof workModel` (TS expands it anyway). If per-section
models are ever adopted, that is the debugging experience. Since the feature is
currently dead, dropping `model:` is worth considering on its own merits.

## Cost

121 runes in the heaviest shape — `sections` + `knownSections` + a nested
`sectionModel`, which is the *pessimistic* mix, since the repo is really 87
`sequence`, 13 `sections` and 3 with `knownSections`:

```
run 1:  loose 1290 ms   typed 1650 ms   (+28%)
run 2:  loose 1368 ms   typed 1648 ms   (+20%)
```

62,518 type instantiations — far below any TS ceiling. Worth re-measuring
against the real tree before committing, since this is a library whose types
consumers' builds also instantiate.

## A trap worth recording

The builder's generic defaults must be `Record<never, never>`, not
`Record<string, never>`. The latter carries a string index signature, so when
`base`/`attributes` are omitted every attribute access type-checks and the whole
thing silently does nothing. `negative/01` caught this during the spike — three
expectations stopped firing while the `resolved` ones kept working, which is
exactly the failure mode that would otherwise ship looking like a success.

## Conclusion

Tractable, and cheaper than expected. The difficulty is not the variety of
content models or their nesting — TypeScript handles both. It is one optional
field that changes a return shape (`emitTag`), and one unused override
(`model:`).

Adoption can be incremental: with the generic defaults in place, an untouched
rune keeps today's loose types, so this lands a plugin at a time rather than as
a 121-rune cutover.
