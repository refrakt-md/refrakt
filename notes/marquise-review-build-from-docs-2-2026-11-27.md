# Build-from-docs review: Marquise + Rivière, second slice (2026-11-27)

I built a fresh slice from the two repositories' docs only (`/home/user/marquise`, `/home/user/riviere`). I read
no other repository, no earlier review and no earlier implementation. Code is at
`/tmp/claude-0/-home-user/cf410873-5e2d-50a6-8be5-ef05cd3e39d7/scratchpad/build-from-docs-2/`. Every forced
choice is marked `// GAP-n:` in the source. This report adds the gaps found while running it (G39 to G60), which
have no code marker or are in fixtures. The code's `GAP-1` to `GAP-21` and `GAP-26` and `GAP-30` to `GAP-38` use
the numbers below. The other code markers map as follows:

| In the code | In this report |
|---|---|
| `GAP-23` | gap 25 |
| `GAP-24` | gap 27 |
| `GAP-25` | gap 28 |
| `GAP-27` | the names contradiction |
| `GAP-28` | gap 29 |

`GAP-18` (item keys), `GAP-22` (an `auto` rule I did not implement) and `GAP-29` (web links) are notes about the
code, not doc gaps.

## What ran

| File | What |
|---|---|
| `src/marquise.ts` | shape loading (YAML 1.2 frontmatter, body limited to `{% example %}`), key/name/type checks, sequence analysis (`field-shadowed`, `field-unreachable`, `shadows-unused`), template checks (`template-ambiguous`, `template-invalid`), the template reader (literals, `**…**`, `*…*`, links, `[? ]`, `[| ]`, typed placeholders, a closing literal matched from the end), document loading (tags and document shapes), attribute validation with defaults, the sequence matcher, item models (parts, templates, fences, single-value lists), rich text, records with `invalid`, validation of data files against the input schema with YAML line positions, and finding printing |
| `src/anchoring.ts` | cyrb53 `digest`, strict and loose normalisation, a TypeScript mask, `symbol` → regex anchor, `auto` extent with the balance self-check, doc-comment and annotation head, verdicts on `strict:loose` markers compared by prefix |
| `src/selectors.ts` | the grammar subset (clauses, `-`, `has:`, `all:`, dotted paths, `fn()` steps, `+`, brackets, comma OR, comparison ops, quoting), with three-valued evaluation: a refused value is unknown, and so is its negation |
| `src/riviere.ts` | config with three collections (documents `work`, data files `people`, `generate: files`), core `ref`/`reviewed` shapes, entities, `id-duplicate`, `id-reused`, `id-pattern-mismatch`, resolution (scope, then tiers id → former id → name, a second corpus-wide search for `ref-wrong-target`), typed refs from attributes and content, mentions (`{% ref %}`, relative Markdown links to files with a symbol fragment, code spans via `mentions.code`), `reviewed` verdicts, inverses in `links`, `riviere: rules` with `selector-inconclusive`, `find`, a JSONL export with `$refs`, stage 1–3 pairing, `id-changed`, `id-collision`, and `baseline: new/existing` |
| `fixtures/m/` | Marquise shapes: `person` (a data shape with an enum, a list and a structured attribute), `snippets` (a sequence with optional `intro`, repeating `panels` matching `fence` with `language`/`label`/`content`, repeating optional `notes`), `credits` (an item template with `[| — | – | - ]`), `broken` (on purpose); `content/page.md`, `content/grace.yaml` |
| `fixtures/make-versions.ts` | writes the three Rivière versions `ancestor` (merge-base), `main` (the `--against` ref) and `head` (the branch). It computes the `reviewed` marker from the real region |

Run with `npx tsx run-marquise.ts` and `npx tsx run-riviere.ts`. The full outputs are in `out-marquise.txt` and
`out-riviere.txt`.

### Marquise output (abridged)

```
== shape analysis (mq.findings)
shapes/broken.md:1  error    shape-key-unknown         (root): unknown key `sumary` (did you mean `summary`?)
shapes/broken.md:1  error    shape-key-unknown         title: unknown value type `strng`
shapes/broken.md:1  error    attribute-type-missing    colour: attribute `colour` declares no type
shapes/broken.md:1  warning  name-camelcase            mediaPos: `mediaPos` is camelCase; shape files use kebab-case
shapes/broken.md:15  error    definition-loose-content  (root): content outside `{% example %}` blocks
shapes/broken.md:1  error    field-shadowed            intro: … a `body` that starts with one needs `intro` …
shapes/broken.md:1  error    field-shadowed            intro: … a `outro` that starts with one needs `intro` …   <- see G40
shapes/broken.md:1  error    field-unreachable         outro: `outro` can never take a node: `body` (repeating) …
excluded: [ 'broken' ]
example snippets#two: ok

== content/page.md findings
content/page.md:17  error    attribute-type-invalid    snippets[1].title: … must be string (got 5)
content/page.md:17  error    attribute-unknown         snippets[1].size: snippets: unknown attribute `size`
content/page.md:17  error    content-missing           snippets[1].panels: snippets.panels: needs a fence
content/page.md:26  error    text-mismatch             credits.people[2]: item does not fit `{name}[| — | – | - ]{role}`
content/page.md:29  error    attribute-value-invalid   #ada.role: person: `wizard` is not an allowed role
content/page.md:31  error    attribute-missing         person[1].name: person: `name` is required
content/page.md:32  warning  content-unmatched         person[1]: person: a paragraph matches no field …
content/page.md:35  error    shape-invalid             broken: shape `broken` has error findings and was left out
content/page.md:39  error    shape-unknown             callout: no shape defines `callout`

== data file content/grace.yaml
content/grace.yaml:2  error    attribute-value-invalid   role: `admiral` is not an allowed role
content/grace.yaml:3  error    attribute-type-invalid    tags: person: `tags` must be a list
content/grace.yaml:4  error    attribute-unknown         media-pos: person: unknown key `media-pos`
content/grace.yaml:5  error    attribute-unknown         contact.fax: unknown key `fax`
```

The records come out in the documented form: `shape`, `address`, `id` and the fields, with `invalid` listing the
refused members. Rich text is `{ markdown, syntax, text, shapes }`, fence items are
`{ language, label, content }`, and the template items read `{ name, role }` with all three dash spellings. One
finding object:

```json
{ "id": "attribute-value-invalid", "severity": "error", "file": "content/page.md", "address": "#ada.role",
  "range": { "start": [29, 0], "end": [30, 0] }, "message": "person: `wizard` is not an allowed role",
  "params": { "name": "role", "value": "wizard", "allowed": ["engineer", "designer", "manager"] } }
```

### Rivière output (abridged)

```
== ancestor snapshot findings
team/merlin.yaml:2  error    attribute-value-invalid   #merlin.role: `wizard` is not an allowed role
plan/work/wrong.md:1  error    ref-wrong-target          #WORK-2.owner: `WORK-1` is a work, not person
plan/work/wrong.md:1  error    ref-unresolved            #WORK-2.related[0]: `WORK-9` names no entity
plan/work/typed-refs.md:13  info     mention-ambiguous         #WORK-1: `util.ts` matches src/a/util.ts, src/b/util.ts
plan/work/typed-refs.md:13  error    ref-ambiguous             #WORK-1: `util.ts` matches 2 entities
plan/work/typed-refs.md:13  error    ref-unresolved            #WORK-1: `nobody-at-all` names no entity
team/grace.yaml:1  warning  person/idle               #grace-hopper: Nobody has given this person any work
team/merlin.yaml:1  warning  selector-inconclusive     #merlin: rule person/idle could not be decided …
== mentions
plan/work/typed-refs.md:10 ref -> people:ada-lovelace
plan/work/typed-refs.md:10 code -> file:src/load.ts
plan/work/typed-refs.md:10 link -> file:src/load.ts#build reviewed 1cca298d:29207245: current
== query: find work "owner.role:engineer"      -> [ 'WORK-1' ]
== query: find people "-role:engineer"          -> [ 'grace-hopper' ], inconclusive (left out): [ 'merlin' ]
== export --jsonl (one line)
{"collection":"work","id":"WORK-2",…,"$refs":{"owner":null,"related[0]":null,"related[1]":{"collection":"work","id":"WORK-3"}}}
== head: plan/work/typed-refs.md:10 link -> src/load.ts#build reviewed 1cca298d:29207245: formatting-only
== validate --against main (merge-base = ancestor)
new       plan/work/newcomer.md:1  error    id-reused     #WORK-3: `WORK-3` is a former id of WORK-30
new       plan/work/wrong.md:1  error    ref-ambiguous      #WORK-2.related[1]: `WORK-3` matches 2 entities
new       plan/work/handedit.md:1  warning  id-changed      #WORK-40: id changed from WORK-4 by hand; record the former id
new       plan/work/collide-b.md:1  error    id-collision   #WORK-5: … also added on the other side, in plan/work/collide-a.md
(8 existing)
== pairing ancestor -> head
stage 1: WORK-3 (renamed.md) -> WORK-3 (newcomer.md)      <- the recorded rename is lost: see G39
stage 3: WORK-4 (handedit.md) -> WORK-40 (handedit.md)
unpaired head: [ 'WORK-5', 'WORK-30' ]
```

Not built: `split` and named sections, groups, `position: last`, compact forms, `explain`, the write path,
reading `path` templates, history-based file renames, and the brace-less-statement rule of `auto` (the docs
specify it; I did not have time).

## Gaps

Severity has three levels. **Blocks** means it cannot be built as written. **Behaviour** means a forced guess
that changes the output. **Cosmetic** means a guess about form only. Paths are relative to each repository.
`M:` is Marquise and `R:` is Rivière.

### Marquise

1. **Blocks.** The finding range's columns (`M:docs/concepts/validation.md:22` against
   `M:docs/concepts/syntax.md:27-28`). The frozen finding object carries `range: { start: [3, 9], end: [3, 21] }`.
   The 1.0 front end is Markdoc, which "gives line ranges only", and the locator that would give columns comes
   after 1.0. *Question:* what do `range` columns and `end` hold in 1.0? *Choice:* column 0, ending at the next
   line. *Others:* `null` columns, or omitting `range`, or both columns 0 on the same line. Consumers (SARIF,
   LSP) would read these differently.
2. **Behaviour.** No complete list of the keys a field or an item model takes, and no finding for an unknown key
   on a field (`M:shapes.md:27-45` lists only the top-level keys). *Choice:* keys collected from examples; an
   unknown key on a field is read as a template member. *Others:* `shape-key-unknown`.
3. **Behaviour.** "Marquise checks a reference's form within the document" (`M:records.md:69-70`), but no form is
   ever defined. *Choice:* any non-empty string. *Others:* the id character rules at `records.md:83-87`.
4. **Behaviour.** Is a Markdoc string `"4"` valid for `type: integer`? The value-parse rule
   (`M:records.md:139-145`) covers only lists. *Choice:* parsed. *Others:* `attribute-type-invalid`. The reverse
   is also undecided: `title=5` on a string attribute (I chose type-invalid).
5. **Behaviour.** The `url` "protocol allowlist" is never listed (`M:records.md:101`, `M:validation.md:75`).
   *Choice:* http, https, mailto and relative.
6. **Cosmetic.** How shape sources reach `createMarquise`. `configuration.md:239-241` says paths or strings;
   `getting-started.md:328` passes `{ shapes: await loadShapes() }` inside configuration, which is "plain data".
   No signature takes strings.
7. **Behaviour.** An unknown top-level key is `shape-key-unknown` (an **error**) "when it is a close match for a
   core key", and otherwise `namespace-unknown` (**info**) (`M:extending.md:57-59`). "Close match" is undefined,
   and it decides whether the shape loads. `findings.md:16` just says "an unknown key in a shape file".
   *Choice:* edit distance ≤ 2.
8. **Behaviour.** What the `selectors` capability object must provide to core (`M:api.md:47`) is never given,
   so I cannot tell when `capability-unavailable` fires for `rules`. *Choice:* treated it as installed.
9. **Behaviour.** An unknown key on an attribute that is not a namespace: `shape-key-unknown`, or
   `namespace-unknown` as at the top level (`M:extending.md:56-59`)? *Choice:* `shape-key-unknown`.
10. **Behaviour.** Does a structured attribute (`fields:`) need `type`? "`type` is required on an attribute a
    shape introduces" (`M:records.md:108-110`), but there is no object type, and the example `sites:`
    (`M:shapes.md:110-118`) has none. *Choice:* not required with `fields`.
11. **Behaviour.** Spacing in `[| — | – | - ]` (`M:content-models.md:411-414`): is a space part of each
    alternative? *Choice:* each alternative trimmed, with one space on each side.
12. **Behaviour.** "Literal text matches text … however the author spaced" (`M:content-models.md:391-393`). Does
    whitespace in a literal match any run of whitespace, none, or exactly what is written? *Choice:* any run,
    including none.
13. **Cosmetic.** "Marquise enables Markdoc's comments" (`M:syntax.md:34-36`); the option is not named.
    *Choice:* stripped before parsing.
14. **Behaviour.** One bad member inside a structured attribute (`contact.fax`): is the whole attribute refused
    (left out and listed in `invalid`), or only that member (`M:records.md:41-50`)? *Choice:* the whole
    attribute.
15. **Behaviour.** How rich text's `text` is formed (`M:records.md:171-190`). The example joins blocks with one
    space and includes a nested callout's **attribute** (`Heads up`). Nothing says which attributes, or what an
    inline `{% ref %}` contributes. *Choice:* plain text of the nodes, joined by a space; tags contribute
    nothing. Search indexes depend on this.
16. **Behaviour.** A template member with `as: inline` (`M:content-models.md:376`, `note: { as: inline }`). Rich
    text needs nodes, but a placeholder captures part of a text run. *Choice:* plain text.
17. **Behaviour.** Fence info-string attributes (`M:content-models.md:49, 345`, `js label="Server"`): Markdoc
    drops them, and the syntax is not specified (Markdoc's own form is `{% label="Server" %}`). *Choice:* a regex
    over the raw opening line.
18. **Behaviour.** Do item records carry `shape` and `address`? "Every record carries `shape`, `address`"
    (`M:records.md:30`), but the example's items (`records.md:13-16`) have neither. *Choice:* none on items.
19. **Behaviour.** No documented API validates input **data** and returns findings with lines. Rivière requires
    "Marquise's own ids" with lines and the same addresses (`R:corpus.md:144-146`), while Marquise offers only
    Standard Schema's `validate`, on a record, errors only, with no lines (`M:validation.md:142-157`). *Choice:*
    an invented `validateData(shape, file, text, rootAddress)` using YAML CST positions.
20. **Behaviour.** In data, is a YAML string `"4"` valid for an integer? Data is "checked against the input
    schema" (JSON Schema: no), while text in Markdown is a value parse (yes). *Choice:* JSON Schema strictness.
21. **Cosmetic.** Are `invalid` entries relative to the record or full addresses? The example
    (`M:records.md:50`) shows `"status"` beside `"#TASK-4"`, so relative; how nested members are written
    (`people[2]`) is not shown. *Choice:* relative.
22. **Cosmetic.** An index counts instances "of that shape name in that container" (`M:writing.md:27-30`). With
    one `person` that has an id and one that has none, the one without is `person[1]`. Should instances with ids
    count? *Choice:* yes.
23. **Behaviour.** A template node whose enum member is not allowed (`Linus – plumber`): is that `text-mismatch`
    (the enum "consumes the longest of its allowed values" and fails), or `attribute-value-invalid` with the
    member's `allowed`? Do the members it lacks also get `content-missing`
    (`M:content-models.md:398-402, 419-420`)? And what does "the node is kept" mean in the record? *Choice:*
    `text-mismatch` only, with an empty `{}` kept in its place.
24. **Cosmetic.** The parameters of most findings are not catalogued: "each entry lists its own as its example
    lands" (`M:findings.md:6-9`), and only two do. I guessed `content-missing`'s, `text-mismatch`'s,
    `field-shadowed`'s and `shape-unknown`'s (for example `field-shadowed` takes `name` plus `other`).

### Rivière

25. **Behaviour.** The core `ref` shape and the `reviewed` marker's shape are never published
    (`R:shapes.md:378`, `R:plugins.md:18-19`, `R:references.md:402-415`). That leaves open their attribute
    names, which one is positional, and whether `reviewed` is core's or the `trace` plugin's. The obvious
    positional name, `id`, is reserved (`M:shapes.md:72`). *Choice:* `target` (positional) and `reviewed` on
    `ref`; `hash` (positional) and `by` on `reviewed`, both in core.
26. **Behaviour.** Does a collection's `shape` make it the **document shape** of its files? "The host's mapping
    (a folder or a collection)" (`M:shapes.md:168-170`), and "a collection collects every instance of its shape
    in its files" (`R:corpus.md:36-38`). Nothing says whether `plan/work/*.md` without `shape:` in frontmatter
    is read with `work` as the document shape, or searched for `{% work %}` tags. *Choice:* a file with
    frontmatter is read as the document shape.
27. **Behaviour.** The `files` collection (`R:corpus.md:512-531`) leaves open the shape's name (`to: [file]`
    implies `file`), the keys the collection takes (`include`? `names`?), what "tracked" means for a non-git
    source, and the hash (a blob id or a content hash). *Choice:* shape `file`, every file listed, sha1 of the
    content.
28. **Behaviour.** A data-file entity's record: does it hold the derived `id`, and is its `address` `#ada-lovelace`
    or the root `''`? (`R:corpus.md:59-65, 645-646`, `M:records.md:30`.) *Choice:* id added, address `#id`.
29. **Behaviour.** The `$refs` key for an item of a list of references (`R:corpus.md:689-693` shows only a scalar
    `owner`). *Choice:* `related[0]`. *Others:* one key, `related`, holding a list.
30. **Behaviour.** A link whose fragment names no region: `ref-unresolved` ("in Rivière a refused reference is
    ref-unresolved", `R:anchoring.md:74-75`) or Marquise's `link-anchor-missing`
    (`R:references.md:557-561`)? *Choice:* `ref-unresolved`.
31. **Behaviour.** A stale `reviewed` marker without the `trace` plugin. `trace-reference-suspect` is the
    plugin's (`R:plugins.md:121`), but markers on mentions are described as if core read them
    (`R:anchoring.md:15-16`). *Choice:* report `trace-reference-suspect`, as if trace were installed.
32. **Behaviour.** `mentions: { code }` is "opted into per collection" (`R:references.md:102-108`). It could be
    the mentioning collection or the target. The `to` reading suggests the mentioning one. *Choice:* the
    mentioning collection.
33. **Cosmetic.** `selector-inconclusive` "names the context and the value" (`M:selectors.md:263`), with no
    parameter names. *Choice:* `name` (the rule id) and `value` (the refused members).
34. **Behaviour.** The JSONL export's line format: only "one record per line", `links` beside `record`, and
    `$refs` are given (`R:queries.md:221-224`, `R:corpus.md:563-565`). *Choice:*
    `{collection, id, address, record, links, $refs}`, with links as `{collection, id}`.
35. **Behaviour.** Stage 3, "the same position among that file's unpaired entities of that shape"
    (`R:corpus.md:789`): position among unpaired entities on both sides at the time of the stage, or position in
    the file? *Choice:* among the unpaired.
36. **Behaviour.** Under `--against` with a common ancestor, are `baseline` and pairing judged against the
    merge-base (what the branch added) or against the ref's head (`R:corpus.md:778-801`; "existing … since those
    already fail on the base")? *Choice:* the merge-base for both.
37. **Behaviour.** The same entity added identically on both sides (a cherry-pick): collision or not
    (`R:corpus.md:794-797`)? The stages pair base with head, never ref-added with head-added. *Choice:* collision.
38. **Cosmetic.** Identity for a finding with no entity in its address: "file (following renames)", but no
    rename data exists without history. *Choice:* file as written.
39. **Blocks.** A reused former id breaks the pairing. The stages are fixed and stage 1 (same `(collection, id)`)
    runs first (`R:corpus.md:782-791`). When `WORK-3` is renamed to `WORK-30` with `formerly: [WORK-3]` and a
    newcomer takes `WORK-3` (`id-reused`, `R:corpus.md:658-662`), stage 1 pairs the newcomer with the old
    `WORK-3` as "the same entity". `WORK-30` is then left with nothing to pair at stage 2 and reads as added.
    That contradicts "a rename recorded in former ids gives no finding: the diff shows it as a rename"
    (`corpus.md:665`). The implementation shows exactly this (see the pairing output above). *Others:* run
    stage 2 before stage 1 for ids that are someone's former id, or exclude `id-reused` entities from stage 1.
40. *(Listed under Contradictions.)*
41. **Behaviour.** For selectors over lists where some items are refused and some match definitely, the docs
    say only that refused values are unknown (`M:selectors.md:258-262`). *Choice:* a definite true wins for
    *any*; `all:` with any unknown item is unknown.
42. **Behaviour.** The source and versions interface for the in-memory source (`R:corpus.md:762-781`: "the
    in-memory source offers everything") is never given: list, read, merge-base, load at a version. *Choice:* I
    built three snapshots and passed them to `against(head, ref, ancestor)`; `rv.load({ at })` is not
    implementable as specified.
43. **Behaviour.** "`--against` checks [a former id] for collisions" (`R:corpus.md:658-659`). Does an id the ref
    added that is a head entity's former id collide? It is unspecified. *Not built.*
44. **Behaviour.** A path template without `{id}` (`plan/work/{title:slug}.md`). Is it legal, and is the id then
    read only from frontmatter (`R:corpus.md:78-92, 637-639`)? *Choice:* legal; frontmatter id. I chose it so
    that renaming an id did not also rename the file, because rename detection needs history.
45. **Cosmetic.** A mention's "passage" address, its paragraph or list item (`R:references.md:88-92`). Marquise's
    address grammar has no step for a paragraph. *Not built*; mentions carry only the entity address and a line.
    The line itself is the paragraph's first line, since Markdoc has no inline positions (follows from gap 1).
46. **Cosmetic.** "A marker … directly after a mention" (`R:references.md:412`): is whitespace between them
    allowed? *Choice:* the next inline sibling.
47. **Cosmetic.** Frontmatter findings have no line: Markdoc does not parse frontmatter, and a YAML CST is
    described only for writing (`M:syntax.md:93-94`). *Choice:* line 1.
48. **Cosmetic.** The form of `ref-wrong-target`'s `target`: an id string or `{collection, id}`? *Choice:*
    `{collection, id}`.

## Contradictions

- **The analysis rule against its worked example** (gap 40, blocks). `M:content-models.md:80-82` checks each
  optional field against "every later field up to and including the first required one". For `intro?`, `body?*`,
  `outro?` that includes `outro`, so `intro` shadows `outro` too: three findings. The worked example
  (`content-models.md:110-114`) says "exactly two". It is unstated whether an unreachable field is dropped from
  the shadowing checks.
- **Corpus-unique collections in the resolution rule.** `R:glossary.md:195-196` gives "qualified, then
  constrained by `to`, **then corpus-unique collections**, otherwise an ambiguity finding". `R:corpus.md:625`
  says "corpus-unique collections need no step of their own".
- **Names in the first release.** File entities carry "a `name` for unique-only resolution" in the first release
  (`R:corpus.md:515`). Names "come later" (`corpus.md:674`), and `names` is a "when a consumer asks" key
  (`R:scope.md:68`). Whether `{% ref "util.ts" /%}` is `ref-ambiguous` or `ref-unresolved` in the first release
  depends on which holds. I chose names on, so it is `ref-ambiguous`.
- **Records carry `shape` and `address`, but item records do not** (`M:records.md:30` against `records.md:13-16`).
- **`other` is one site, but `ref-ambiguous` puts a list there.** `M:validation.md:41` defines `other` as "the
  second site of a clash, with its own `file` and `address`"; `R:findings.md:349` puts "the candidates" there.
- **Unknown top-level keys.** `M:findings.md:16` ("an unknown key in a shape file" is `shape-key-unknown`,
  error) against `M:extending.md:57-59` (only a close match is; anything else is `namespace-unknown`, info).
- **Shapes in configuration.** `M:configuration.md:207` uses `"shapes": ["shapes/"]` (paths in plain JSON);
  `M:getting-started.md:328` and `R:README.md:26` pass loaded shapes (`await loadShapes()`) in the same
  position.
- **Printed finding form.** `M:validation.md:28-29` says "the CLI prints them as `file:line  address`"; the
  example at `validation.md:7` prints `file:line  severity  id  address: message`; `R:corpus.md:645-646` joins
  them as `team/ada.yaml#ada-lovelace.role`. These may all be compatible, but no one canonical form is stated.

## Depends on unpublished text

- refrakt's SPEC-201: content-models.md says it "is their specification", yet the syntax "compiles down to what
  refrakt's resolver already understands", and `explain`'s JSON is "built in refrakt" (`M:content-models.md:7-11,
  175-177`).
- "K4" (`R:corpus.md:381`, "a clash between two kits is Marquise's (K4)"): an unpublished numbering.
- refrakt's `data` rune readers, "the implementation to extract" for data files (`R:corpus.md:165-166`).
- refrakt's SPEC-145 for `$attrs`, `$each`, `$item` and `$row` (`M:glossary.md:11-13`).
- The published JSON Schemas (`config.schema.json`, record and input schemas, the authoring grammar's format):
  described but never shown, so `riviere.config.json` validation and "the input schema" (gaps 19 and 20) are
  guesses.
- "the build-from-docs slice" as a conformance suite (`M:api.md:187-188`): referenced, not published.
- Anchoring states it needs no refrakt text, and that held for this slice: I needed no SPEC-131 or SPEC-134
  detail.

## What was clearly specified

- The review hash: the exact digest code, both normalisations, the marker form, prefix comparison and the three
  verdicts. Formatting-only came out on the first try.
- The finding object's members, the shared parameter vocabulary, and the ids for the attribute, content and
  reference cases.
- Sequence matching: one cursor, no backtracking, a repeat takes the whole run, optional versus required.
- The overlap table for start sets (except the contradiction above).
- The invalid-value rule (left out, never defaulted, listed in `invalid`), and selectors reading it as unknown,
  negation included.
- The resolution tiers, and `ref-wrong-target` found by a second, corpus-wide search.
- The stage table for pairing, and the `baseline` marking.
- Reserved names, YAML 1.2, and kebab-case in shape files with camelCase in data.
