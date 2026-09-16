{% work id="WORK-555" status="done" priority="medium" complexity="trivial" milestone="v0.34.0" source="BUG-014" tags="runes, cleanup, validation, breaking" %}

# Remove the error rune

`packages/runes/src/tags/error.ts` is a leftover from refrakt's predecessor. It
emits a bare `<tr>` of four `<td>`s from a Markdoc `ValidationError`, has never
had a producer, and cannot be written by an author without crashing the build.

Delete it.

## Why it goes rather than gets fixed

It is outside every convention the project has built since it arrived:

| | |
|---|---|
| Engine config entry in `config.ts` | none — there is no `Error:` key |
| CSS in Lumina | none — `rf-error` appears nowhere |
| Entry in `contracts/structures.json` | none |
| Doc page | none — listed in `PAGELESS` and `EXCLUDED_RUNES` |
| Fixture | none |
| Producer | none, in any version in this repo's history |

No BEM block, no modifiers, no contract, no styling — yet it is present in
`refrakt inspect --list` and in language-server completions as
"Error reporting table", category Semantic. Invisible to every convention,
visible in every autocomplete.

### It is a live crash, not merely dead weight

`tags` is built by `runeTagMap(runes)` (`packages/runes/src/rune.ts:76`), which
applies no internal filter, so `{% error %}` is author-writable. The schema
declares no required attributes and the transform dereferences immediately:

```ts
const err = attrs.error as ValidationError;
const code = new Tag('td', {}, [err.id]);
```

`createContentModelSchema` calls `options.transform(...)` with no `try`/`catch`
(`packages/runes/src/lib/index.ts:548`). So an author who finds `error` in
autocomplete and writes `{% error /%}` gets
`Cannot read properties of undefined (reading 'id')` and a dead build. A rune
no author can write correctly is worse than no rune.

Consistent with this, the fixture corpus has no `error` fixture — one would fail
`fixture-corpus.test.ts`'s `transform` does-not-throw assertion.

Three further tells that it has never executed: `type` and `lines` are declared
and never read; `children: [tag, code, level, message]` disagrees with
`properties: { code, tag, level, message }`; and no header row exists anywhere,
so the four columns are unlabelled.

### Its shape would misdirect SPEC-132

{% ref "SPEC-132" /%} originally proposed giving this rune its input. That is
withdrawn. A bare `<tr>` is invalid HTML outside a table and nothing emits a
wrapper, so the rune presumes a caller that collects many findings into
`<table><thead>…` — that is, a **page-level report**. Adopting it would pick
that model because a leftover row exists, not because it is right; the better
precedent is `snippet`'s error fence, which reports *at the site of the
problem* and already ships.

If a findings table is later wanted, it should be designed as one — a
block-level container owning its table, header row, config entry and CSS.

## Acceptance Criteria

- [x] `packages/runes/src/tags/error.ts` is deleted
- [x] Its import (`packages/runes/src/index.ts:6`) and catalog entry (`:260`) are removed
- [x] `'error'` is removed from `EXCLUDED_RUNES` in `packages/runes/src/reference.ts`
- [x] `'error'` is removed from `PAGELESS` in `scripts/check-rune-docs.mjs`
- [x] `nodes.error = Markdoc.nodes.error` (`packages/runes/src/index.ts:737`) is **left untouched** — it is Markdoc's built-in parse-error node and unrelated
- [x] `npm test` passes, including `check-rune-docs` and the CSS coverage tests
- [x] `npx refrakt contracts --check` still reports up to date (the rune was never in the contract, so the count drops by one with no other diff)
- [x] `refrakt inspect --list` no longer offers `error`, and neither does language-server completion
- [x] A changeset records it as a removal

## Approach

Deletion, then let the exception lists shrink. Both `EXCLUDED_RUNES` and
`PAGELESS` are maintained "known gaps" sets, and removing an entry from each is
the signal that this is cleanup rather than suppression — the same reasoning
`check-rune-docs.mjs` gives for keeping those sets honest in the first place.

Check the rune count in any prose that states one before landing: the docs
carry several such claims and the contract header reports "(N runes)".

## Notes

**Breaking in name only.** Removing a catalogued rune is nominally a breaking
change, but no user can have a working `{% error %}` in their content — writing
it crashes the build. The affected set is provably empty, so this is safe in a
minor.

## References

- {% ref "BUG-014" /%} — where the rune's state was catalogued; this is symptom 3
- {% ref "SPEC-132" /%} — no longer depends on this rune; see its display open question
- `packages/runes/src/rune.ts:76` — `runeTagMap`, which is why the tag is author-reachable
- `packages/runes/src/lib/index.ts:548` — the unguarded `options.transform` call

## Resolution

Completed: 2026-09-15

Branch: `claude/milestone-v0-34-0-5zoab0`

### What was done

- `packages/runes/src/tags/error.ts` — deleted.
- `packages/runes/src/index.ts` — removed the `import { error }` and the
  `defineRune` catalog entry. `nodes.error = Markdoc.nodes.error` (now line
  1096) left untouched, as the item required.
- `packages/runes/src/reference.ts` — `'error'` removed from `EXCLUDED_RUNES`.
- `scripts/check-rune-docs.mjs` — `['error', null]` removed from `PAGELESS`.
- `site/content/_data/rune-attributes.json` — regenerated via
  `npm run runes:attributes`; the rune's four attribute rows (125 lines) are
  gone.
- `scripts/generate-rune-attributes.test.mjs` — one test repointed (see below).
- `.changeset/remove-error-rune.md` — added, as a `minor` on
  `@refrakt-md/runes`.

### The one thing the item did not anticipate

Two tests failed on the first run, both in
`scripts/generate-rune-attributes.test.mjs`:

1. **`pageForRune('error')` was pinned to `null`.** The test's stated purpose is
   to prove that "internal, authored nowhere" and "documented on the parent's
   page" stay distinct answers — `error` was merely the example it used.
   Repointed at `region`, which is now the only `null` entry in `PAGELESS`. The
   assertion the test exists to make is preserved; only its subject moved.
2. **The committed `rune-attributes.json` still carried the rune.** Freshness
   check, working as designed. Regenerated with the documented command.

Neither is in the item's acceptance criteria, which is worth recording: the
criteria covered `check-rune-docs` and the CSS coverage tests but not the
attribute-artifact guard, which postdates the item's drafting.

### Verification

| Check | Result |
|---|---|
| `npm run build` | exit 0 |
| `npx vitest run` | **4402 passed**, 361 files, exit 0 |
| `node scripts/check-rune-docs.mjs` | ✓ rune docs in parity |
| `refrakt contracts --check --site main` | OK, up to date (132 runes) |
| `refrakt inspect --list --site main` | 126 runes; `error` absent as name and as alias |
| `npm run format:check` | 1290 files, no fixes applied |

### Notes

**The contract count did not drop.** The item predicted "the count drops by one
with no other diff", which sits oddly beside its own (correct) observation that
the rune was never in the contract. Both cannot hold: it was never there, so
removing it changes nothing — `contracts --check` reports 132 runes before and
after. The criterion's substance ("still reports up to date") is satisfied.

**Language-server completion is covered structurally, not by a test.**
`packages/language-server/src/registry/loader.ts:44` indexes
`Object.values(runes)` — the same catalog the entry was removed from — so
completion cannot still offer it. Verified by reading the load path rather than
by running the extension.

**No rune-count prose needed editing.** The counts in `site/content/releases.md`
are historical changelog entries describing past releases and are accurate for
the versions they describe. The live counts (`inspect --list`, the contract
header) are generated.

{% /work %}
