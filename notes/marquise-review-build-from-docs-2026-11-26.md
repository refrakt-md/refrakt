# Building Marquise and Rivière from their docs: a review, 2026-11-26

I implemented a thin slice of each design from `/home/user/marquise` and `/home/user/riviere` (READMEs and
`docs/concepts/*.md`) and nothing else. This report lists every place the docs left me guessing. The code is
in `build-from-docs/` beside this file: `src/marquise.ts`, `src/selectors.ts`, `src/riviere.ts` and
`src/run.ts`. Every guess is marked `// GAP-n:` at the point where it changes behaviour, and the gap numbers
below match those comments.

## What ran

**Environment.** Node 22. I installed `@markdoc/markdoc`, `yaml` and `tsx` from npm, so the parser is the real
one, not a stub. Run it with `npx tsx src/run.ts`; the full output is in `build-from-docs/out.txt`.

**Fixtures.**
- `shapes/person.md` is a data shape. It has attributes only: `name` (required), the enum `role` and the list
  attribute `skills`. Its `riviere:` namespace declares the inverse `tasks: { of: tasks.owner }` and the rule
  `engineer-idle: 'role:engineer -has:tasks'`.
- `shapes/task.md` has these attributes: the enum `status` (required), the enum `priority` with a default,
  `owner: { type: ref, to: [person] }`, the list reference `blocked-by` and the former-id field `formerly`. Its
  content model is a `sequence` of `title` (a heading, `as: inline`), `summary` (an optional paragraph, with
  `shadows: [notes]`) and `notes` (`any`, repeating, optional). It declares the rule
  `high-for-intern: 'priority:high owner.role:intern'` and two `{% example %}` blocks, one of which has
  `expect`.
- `shapes/note.md` is broken on purpose, to exercise shape analysis.
- `riviere.config.json` has two collections. `tasks` holds Markdown tags in `content/tasks/*.md`, with
  `id: TASK-{n}` and `formerIds: formerly`. `people` holds YAML files in `team/*.yaml`, with
  `id: { from: name }` and `names: [name]`.
- The corpus exists in three versions: `fixtures/v1` is the base. `fixtures/v2` renames `TASK-2` to `TASK-20`
  with a former id, renames `TASK-4` to `TASK-40` by hand, and adds `TASK-6`. `fixtures/v3` is v2 plus a new
  entity that takes the former id `TASK-2`.

**What works**, with excerpts from the output:

```
== 1. Marquise: shape findings
shapes/note.md:1  warning name-camelcase    note.Kind
shapes/note.md:1  error   shape-key-unknown note.Kind: unknown type `strng`
shapes/note.md:1  error   field-shadowed    note.lede: takes what `rest` could start with; acknowledge with shadows: [rest] …
shapes/task.md:1  info    field-shadowed    task.summary shadows notes (acknowledged)

== 1. Marquise: one document
{"shape":"task","id":"TASK-1","address":"#TASK-1","status":"open","priority":"medium","owner":"ada-lovelace",
 "blockedBy":["TASK-2"],"title":{"markdown":"Write the loader",…},"summary":{…},"notes":{"markdown":"- cache by content hash\n- report findings",…}}
content/tasks/sprint.md:20 error attribute-type-invalid #TASK-4.status: must be one of open, doing, done (got "blocked")
content/tasks/sprint.md:20 error attribute-unknown      #TASK-4: unknown attribute `size`
content/tasks/sprint.md:24 error attribute-missing      #TASK-5.status: missing required attribute `status`
content/tasks/sprint.md:25 error content-missing        #TASK-5.title: needs a heading
content/tasks/sprint.md:28 error shape-invalid          note: shape `note` has error findings and was left out

== 2. Rivière: snapshot of v1
people:ada-lovelace  links={"tasks":["TASK-1"]}          (inverse)
TASK-2.owner "Grace Hopper" -> people:grace-hopper       (resolved by name)
team/linus.yaml:2 error attribute-type-invalid team/linus.yaml#linus.role (got "wizard")
team/linus.yaml:3 error attribute-type-invalid team/linus.yaml#linus.skills: must be a list (got "kernels, git")
sprint.md:16      error ref-unresolved         #TASK-3.owner: no entity `ghost` in person
sprint.md:12      warning task/high-for-intern #TASK-2          (forward path through a reference)
team/edsger.yaml:1 warning person/engineer-idle #edsger-dijkstra (through the inverse)
c.find('tasks', 'status:open,doing owner.role:engineer,intern') -> TASK-1, TASK-2
c.find('people', '-has:tasks') -> edsger-dijkstra, linus

== 3. validate --against v1 (head v2)
warning id-changed    #TASK-40: TASK-4 became TASK-40 by hand  fix={set #TASK-40.formerly ["TASK-4"]}
info    ref-former-id #TASK-1.blockedBy[0]: `TASK-2` is a former id of TASK-20  fix={set … "TASK-20"}
error   ref-unresolved #TASK-6.blockedBy[1]: no entity `TASK-99`
== 3b. head v3 (a new TASK-2 alongside TASK-20's former id TASK-2)
error   id-reused     #TASK-2
TASK-1.blockedBy now resolves to: TASK-2 (Someone took the next free-looking number)
```

**Not built:** `split`/`zones`/`sections`, item models, templates, explicit slots, value types beyond
string/number/boolean/ISO date, nested shapes in rich text, selector brackets, `$this`, closures, shifts,
regexes, `acyclic`, `inverseOf`, writes, and the merge-base half of `--against`. Selectors and rules are wired
straight into Rivière's snapshot rather than installed as `@marquise-md/selectors`. Because the selectors
capability is not installed, a top-level Marquise `rules:` key reports `capability-unavailable`.

## Gaps

Each gap gives its severity, the doc and lines I was reading, the question the docs did not answer, the
choice I made, and what another implementer might plausibly choose instead.

Severity takes three values:
- **blocks:** I could not implement the concept as written.
- **behaviour:** the docs forced a guess that changes what the code outputs.
- **cosmetic:** the guess changes presentation only.

### Marquise

**GAP-1: finding parameters are frozen but never listed.** *Behaviour, and it affects the contract.*
- **Reading:** `validation.md:16-17` ("ids and parameters may not [change]"), `principles.md:58`,
  `schema.md:41` (the catalogue holds "its parameters") and `findings.md` (the whole table, which has no
  parameters column).
- **Question:** what parameters does any finding carry, under what names and with what types?
- **My choice:** I invented names such as `{attribute, got, allowed}`, `{field, match}`, `{written, to}` and
  `{from, to}`.
- **Divergence:** every implementer will invent different keys, and those are exactly what CI gates and AI
  fix loops are meant to key on. This is the biggest hole in a contract the docs call frozen.

**GAP-2: there is no list of attribute `type` values.** *Behaviour.*
- **Reading:** `shapes.md:296`, `records.md:60-68` and `scope.md:273`.
- **Question:** which values may `type:` take? The value-type table has no `string` and no `ref`, although
  every example uses `string` and references use `ref`.
- **My choice:** `string, number, integer, boolean, date, datetime, url, duration, ref`. An unknown type is
  `shape-key-unknown`.
- **Divergence:** another implementer could omit `type` to mean string, allow `text`, or use a different
  finding for an unknown type.

**GAP-3: there is no API for registering an extension namespace, and the ordering contradicts the design.**
*Blocks* Rivière's shape keys as specified.
- **Reading:** `extending.md:54-59` ("each extension registers a schema for its namespace"; "extensions read
  `shape.extensions.<name>`"), `api.md:69` (the instance is immutable) and riviere `README.md:26-28`
  (`createMarquise()` runs first and its result is passed to `createRiviere()`).
- **Question:** how does Rivière register `riviere:` with an instance that already exists and cannot change?
  Until it does, every `riviere:` key in every shape is `namespace-unknown`, and nothing validates it.
- **My choice:** I pass `namespaces: ['riviere']` into the Marquise constructor.
- **Divergence:** another implementer could pass Rivière as a capability to `createMarquise`, have
  `createRiviere` rebuild the instance, or have Rivière read raw frontmatter.

**GAP-4: a shape's name is not stated to come from its file name.** *Cosmetic.*
- **Reading:** `overview.md:239` and `shapes.md`.
- **Question:** where does the name come from: the basename or a `name:` key? And what happens with a kit's
  qualified name, `@kit#x`?
- **My choice:** the basename.
- **Divergence:** a `name` frontmatter key. Kits need one of these answers anyway.

**GAP-5: an unknown key and an uninstalled namespace look the same.** *Behaviour.*
- **Reading:** `findings.md:380-381`, `extending.md:56-57` and `shapes.md:310`.
- **Question:** a top-level key that is neither core nor installed could be a typo, which would be
  `shape-key-unknown` (error), or an absent extension, which would be `namespace-unknown` (info). How are the
  two told apart?
- **My choice:** I report it as `namespace-unknown`.
- **Divergence:** reporting it as an error. Typo detection and graceful degradation pull in opposite
  directions.

**GAP-6: the format of an example's `expect` is unspecified.** *Behaviour.*
- **Reading:** `shapes.md:388-391` and `scope.md:279`.
- **Question:** is `expect` a list of ids, of `id@address` pairs, or counts? Is it an array or a string?
- **My choice:** a comma-separated string of ids.
- **Divergence:** a Markdoc array, ids with addresses, or an exact match versus a subset match.

**GAP-7: a failing example has no finding id.** *Behaviour.*
- **Reading:** `validation.md:290` ("broken examples") and `findings.md`, which has no matching id.
- **My choice:** I invented `example-failed`.
- **Divergence:** reuse the inner findings, or report `shape-invalid`.

**GAP-8: the scope of `field-shadowed` is unclear.** *Behaviour.*
- **Reading:** `content-models.md:58`: "an optional field takes what a later field could start with".
- **Question:** does "a later field" mean every later field, or only those that can receive the node when
  this field is empty? A required field in between stops the node from reaching anything after it.
- **My choice:** I check later fields up to and including the first required one.
- **Divergence:** check every later field. That reports more errors, and so needs more `shadows:`
  acknowledgements, for the same shape. Because strict is the default, this changes whether a shape loads at
  all.

**GAP-9: references have no JSON form in records.** *Behaviour.*
- **Reading:** `records.md:57-68` (no `ref` row) and riviere `corpus.md:651-653` (`Ref<'spec'>` with
  `.resolve()`).
- **Question:** is a reference in a record the written string, a normalised id, `{collection, id}`, or
  `{ref: …}`?
- **My choice:** the written string, so `"owner": "Grace Hopper"` stays as written even though it resolves to
  the entity `people:grace-hopper` by name.
- **Divergence:** any of the other forms. This changes every export, every JSON Schema and every consumer.

**GAP-10: the base of an address index is unclear.** *Behaviour.*
- **Reading:** `writing.md:15-16` and `:26-31` (`hero.headline`, `hero[1].align`, "indexes from 0", "the
  most stable address").
- **Question:** is the index counted among siblings, among top-level tags, or among every instance of the
  shape in the document? Is the first instance written `hero` or `hero[0]`? What is the address prefix for a
  tag inside a document that has a document shape?
- **My choice:** every instance of the shape in document order, with `[0]` omitted.
- **Divergence:** sibling order, or always writing `[0]`. Addresses are a frozen contract.

**GAP-11: it is unclear whether records carry `address`.** *Cosmetic.*
- **Reading:** `records.md:6-23` and `getting-started.md:369` (records without one) against `records.md:132`
  (a nested record with one).
- **My choice:** every record carries it.

**GAP-12: Markdoc's `.class` shorthand is never mentioned.** *Cosmetic.*
- **Question:** is `class` an unknown attribute, ignored, or reserved?
- **My choice:** I ignore it.

**GAP-13: empty items in a comma string are unspecified.** *Behaviour.*
- **Reading:** `records.md:100-107`.
- **Question:** what does `tags="a,,b"` give, and what does `tags=""` give?
- **My choice:** I drop empty items, so `""` gives `[]`.
- **Divergence:** a `value-ambiguous` or type error, or `[""]`.

**GAP-14: one id covers both a wrong type and a disallowed value.** *Behaviour, for consumers.*
- **Reading:** `findings.md:426`.
- **Question:** `attribute-type-invalid` covers both cases. With no parameters specified (GAP-1), a fix loop
  cannot tell which one happened.
- **My choice:** I put `allowed` in `params` only for the disallowed-value case.

**GAP-15: is a `repeat` field without `optional` required?** *Behaviour.*
- **Reading:** `content-models.md:29-31` and `shapes.md:278`.
- **My choice:** it is required to take at least one node, so an empty callout is `content-missing`.
- **Divergence:** read `repeat` as zero or more.

**GAP-16: what is `markdown` for an `as: inline` heading?** *Behaviour.*
- **Reading:** `content-models.md:106` against `records.md:140` ("the source as written").
- **Question:** is it `# Title` or `Title`?
- **My choice:** `Title`.

**GAP-17: a repeating block field gives one value or a list.** *Behaviour.*
- **Reading:** `records.md:17-22` shows one rich-text value, but no rule says so.
- **My choice:** one rich-text value joining the taken nodes.
- **Divergence:** `RichText[]`. This changes generated types and addresses (`body[1]`).

**GAP-39: invalid values in records are unspecified.** *Behaviour.*
- **Reading:** `records.md:232` ("records arrive with findings") and `api.md:73`.
- **Question:** when `status="blocked"` is refused, does the record keep `"blocked"`, drop it, apply the
  default, or drop the whole record?
- **My choice:** I drop the value and apply no default. As a result `TASK-4` has no `status`, and Linus, whose
  role `wizard` was refused, matches `-has:…` selectors.
- **Divergence:** keep the raw value. Rules and queries over invalid content then give different answers.

**GAP-41: it is unclear whether example findings count as shape errors.** *Behaviour.*
- **Reading:** `api.md:73` ("a shape with error findings is left out") together with `shapes.md:390`.
- **Question:** does a broken example remove its shape?
- **My choice:** no. I decide whether to leave a shape out before its examples run.

### Rivière

**GAP-18: the slug rule's edges are unspecified.** *Cosmetic, but ids depend on it.*
- **Reading:** `corpus.md:60`.
- **Question:** what happens to a leading or trailing run of non-letters ("Ada Lovelace." becomes
  `ada-lovelace-`)?
- **My choice:** I trim them.

**GAP-19: no finding covers a collection whose `shape` does not exist.** *Behaviour.*
- **My choice:** I reuse `config-unregistered`.

**GAP-20: `extends` is not implemented.** This is out of scope for the slice, and noted only for
completeness.

**GAP-21: the form of `id.from` is inconsistent.** *Behaviour.*
- **Reading:** `corpus.md:54` (`{ from: 'term.name' }`) against `corpus.md:136` (`{ from: 'name' }`).
- **Question:** is the shape prefix required, optional, or a path into nested fields?
- **My choice:** I use the last segment.

**GAP-22: a data file that does not parse has no finding id.**
- **My choice:** I invented `data-file-invalid`.

**GAP-23: one record and a map of records are indistinguishable.** *Behaviour.*
- **Reading:** `corpus.md:128-142`.
- **Question:** "a map gives one entity per key, the key being the id", but `team/ada.yaml`, a single record,
  is itself a map.
- **My choice:** I read the file as a map of records only when every value is an object and no key is a
  declared attribute.
- **Divergence:** an explicit `at:` or a per-collection flag. A person whose only fields are objects would be
  misread.

**GAP-24: data-file validation has no finding ids.** *Behaviour.*
- **Reading:** `corpus.md:139` ("validated against the shape's input schema … same addresses").
- **Question:** which ids does that validation report? The catalogue's ids describe tag attributes.
- **My choice:** I reuse `attribute-*`.
- **Divergence:** JSON Schema-style ids such as `input-invalid`.

**GAP-25: data-file key spelling is unspecified.** *Behaviour.*
- **Question:** do data files use kebab-case shape names or camelCase input names?
- **My choice:** I accept both.
- **Divergence:** accept only camelCase, which is what the input schema implies.

**GAP-26: `id-reused` in a single snapshot is unclear.** *Behaviour.*
- **Reading:** `corpus.md:628`.
- **Question:** "no **new** entity may use it", but one snapshot cannot say which of the two entities is new.
- **My choice:** I report the holder of the current id every time.

**GAP-27: the resolution rule has no case for an unqualified reference outside unique collections.**
*Behaviour.*
- **Reading:** `corpus.md:599-604`.
- **Question:** with no qualifier and no `to`, and collections that are not corpus-unique, which collections
  are searched? Step (3) covers only corpus-unique collections, and step (4) does not say over what.
- **My choice:** I search all collections.
- **Divergence:** search none, or treat a match in two collections as an ambiguity.

**GAP-28: the address form for corpus findings is unclear.** *Behaviour.*
- **Reading:** `references.md:39` ("the reference's own address"), `corpus.md:614` (`#WORK-123.criteria`)
  and Marquise `writing.md:21` (`docs/guide.md#install.steps[3]`).
- **Question:** which form does a corpus finding print?
- **My choice:** `#id.field` with a separate `file`. My data-file findings came out as `file#id.field`, and
  the inconsistency shows in the output; the docs allow both.

**GAP-29: a reference resolved by name gets no finding.**
- **Question:** should resolution by name be silent, or should it suggest the id?
- **My choice:** silent.
- **Divergence:** an info finding that suggests the id, by analogy with `ref-former-id`.

**GAP-30: `ref-wrong-target` cannot fire.** *Behaviour.*
- **Reading:** `references.md:31` and `corpus.md:602`.
- **Question:** the `to` list already restricts the search to the allowed shapes, so a wrong target can never
  be found. When does it fire?
- **My choice:** only when a qualifier names a collection of another shape.
- **Divergence:** resolve first without `to` and then check the target, which makes the rule's step (2)
  pointless.

**GAP-31: the spelling of an inverse's `of` is loose.**
- **Question:** is the field in `of: tasks.owner` kebab-case or either spelling? A list form also exists.
- **My choice:** both spellings, and lists.

**GAP-32: `has:` on an empty list under "any" semantics.**
- **My choice:** an empty list reaches nothing, so `has:` is false. This is consistent with `selectors.md:27`.

**GAP-33: a literal compared with a reference.** *Behaviour.*
- **Reading:** `selectors.md:82` ("references compare by identity").
- **Question:** is the literal in `owner:ada-lovelace` resolved with the field's `to` constraint, or by the
  unconstrained rule?
- **My choice:** the unconstrained rule.
- **Divergence:** the constrained rule. The two differ when an id exists in two collections.

**GAP-34: rule defaults are unspecified.**
- **Question:** what is a rule's default `severity`, and is `message` required?
- **My choice:** error, and the rule name as the message.

**GAP-35: what does "the same location" mean for `id-changed`?** *Blocks* the check as written.
- **Reading:** `corpus.md:630`: "an entity at the same location whose id changed gives `id-changed`".
- **Question:** location is `file#id` (`corpus.md:587-590`), so an entity whose id changed is never at the
  same location. With `path: '{id}-{title:slug}.md'` a renamed document also moves. What pairs the base
  entity with the head entity?
- **My choice:** same file, same shape and same ordinal, among entities left unpaired after matching by id
  and by former id.
- **Divergence:** git rename detection, a content-similarity match, or line position. Each gives a different
  set of `id-changed` findings.

**GAP-36: is a rename with a former id silent under `--against`?** *Behaviour.*
- **Reading:** `corpus.md:628-631` and `:720-722`.
- **My choice:** silent; the diff reads it as a rename. References still using the old id get
  `ref-former-id`.
- **Divergence:** an info finding announcing the rename.

**GAP-37: `--against` without a merge-base.** *Behaviour.*
- **Reading:** `corpus.md:716-718` ("otherwise with the version itself") and `cli-and-mcp.md:38-39` ("an id
  the base branch added after the branch point").
- **Question:** without an ancestor, a collision cannot be told apart from an id both sides share. What does
  `--against` report then?
- **My choice:** only collisions with former ids recorded at the base.

**GAP-38: what `validate --against` outputs, and how findings are matched across versions.** *Behaviour.*
- **Reading:** `references.md:372` ("reports a rule newly broken on a branch") and `queries.md:153`.
- **Question:** is the output only what is new on the branch, or everything? How is "the same finding"
  recognised when its address contains an id that was renamed?
- **My choice:** head findings whose (id, address with renames mapped back, written value) is absent at the
  base, plus the diff's own findings.
- **Divergence:** all head findings with the new ones marked, or matching by message. Without the rename
  mapping, every finding on a renamed entity shows as new.

**GAP-40: a reused former id silently re-points references.** *Behaviour, and data-integrity relevant.*
- **Reading:** `corpus.md:605` ("an id always wins") against `:628-629` ("a former id stays taken … so a
  redirect never quietly points at something new").
- **What happened:** in `fixtures/v3`, `TASK-1.blockedBy: TASK-2` used to reach `TASK-20` through the former
  id. Once someone adds a new `TASK-2`, the reference resolves to the newcomer. `id-reused` fires, but it is
  the only signal, and the dependency edge has already changed.
- **Question:** while the error stands, does the reference resolve to the former-id holder, to the newcomer,
  or to nothing (as an ambiguity)? Under `--against`, pairing by id first also hides the rename.
- **My choice:** I followed the rule literally: the id wins.

## Contradictions found while reading (outside the slice's code paths)

- **C1.** `references.md:10` puts `sections:` at the top level of a shape. `plan-as-shapes.md:72` and
  `content-models.md:144` nest it under `content:`.
- **C2.** `getting-started.md:382` says "a missing title … is a finding", but the callout's `title` is not
  `required`.
- **C3.** riviere `corpus.md:639-642` says "names come later; their step … is reserved now", yet `names:` is
  used throughout as a working key.
- **C4.** Content item fields use `matches` without `as` (`stance: { matches: [supports, contradicts] }`,
  `content-models.md:240`). The items' value type is then undeclared: is it string by default?
- **C5.** `scope.md:273` lists the attribute keys and has no namespace key. `extending.md:40-49` puts
  `riviere:` on attributes and fields, and the plan examples rely on it.

## Depends on unpublished text

These places lean on text outside the two repositories:

- **Refrakt's SPEC-201** is cited as the normative definition of content-model matching ("specified in
  refrakt's SPEC-201", "SPEC-201 D1") at marquise `content-models.md:8, 23, 43, 83, 172` and riviere
  `plan-as-shapes.md:207`. The matching rules are called "decided", but their authority is elsewhere.
- **SPEC-199** and refrakt's brainstorm notes carry the reasoning, at marquise `README.md:182-185` and
  `scope.md:266`.
- **SPEC-145, SPEC-168 and SPEC-197** (templates and compose) appear at marquise `scope.md:237`,
  `extending.md:80, 268, 289, 292` and `glossary.md:13, 179`. **SPEC-189** appears at `extending.md:136`.
- **SPEC-134** defines the fingerprint format and its decisions D2, D3, D4, D5 and D8, at riviere
  `references.md:389-452` and `glossary.md:204`. The canonical serialisation is "hashed in SPEC-134's format",
  so the hash cannot be implemented from these docs.
- **SPEC-131** (anchoring, refrakt's `snippet`) is cited at `references.md:83, 189`. The anchoring package's
  "language table" is never published.
- **SPEC-136 D13** is cited at `references.md:122`.
- **"K4"** at riviere `corpus.md:366` ("a clash between two kits is Marquise's (K4)") is defined nowhere in
  either repository.
- **The spikes** in refrakt's repository are cited as evidence for decisions: `spike/parser-positions`,
  `spike/markdoc-locator`, `spike/marquise-cel` and `spike/marquise-comark` (marquise `syntax.md:52, 92, 199,
  257`; riviere `references.md:332`).
- **The refrakt resolver and `emitTag`** are cited as reference implementations ("compiles down to what
  refrakt's resolver already understands", `content-models.md:9`; `scope.md:230`). The same goes for
  refrakt's `data` rune readers (riviere `corpus.md:155`).
- **Example identifiers** such as SPEC-12, SPEC-196 and SPEC-40 are harmless placeholders, not
  dependencies.

## Questions a second implementer would ask

These are not gaps in my slice; I noticed them on the way.

1. How are Rivière's own shapes (`ref`, `collection`, `expand`…) delivered to Marquise? Without them,
   `{% ref %}` in plain Marquise is `shape-unknown`, yet `tag:ref` is a core Marquise matcher name.
2. Is an id that does not fit the collection's id pattern (`id: TASK-{n}`, read as `foo`) a finding? The docs
   call patterns "creation-time" and ids "opaque", but `ids: 'corpus'` inference and bare-id mentions depend
   on the pattern.
3. Data shapes are "never read from Markdown". Is writing `{% person %}` as a tag then an error, and which
   finding is it?
4. `record.address` for a document shape: is it `#id` or the file?
5. `selector-value-unknown` and `selector-field-unknown` are checked "when a shape loads" against "every
   shape the selector can apply to". For a path through a reference (`owner.role`), the check needs `to`
   resolved to collections, which only Rivière knows. Who reports these, and when?
6. Rules inside `riviere:` reuse Marquise's rule form. Are the rule ids scoped `person/engineer-idle` in
   Rivière's catalogue or in Marquise's, and does `rule-id-reserved` check against both catalogues?
7. The `riviere: { acyclic: true }` key sits on a section field. Is the extension data for a field under
   `shape.extensions.riviere.fields.x`, or on the field object itself?
8. Inverses are kebab-case in shape files (`verified-by`) and "read like fields". Can an inverse collide with
   a field of *another* shape that the same selector applies to?
9. `--now` and `timezone`: is `$today` a date in the corpus zone or in UTC, when the config omits the zone and
   Marquise's own config sets a different one?

## What was clearly specified

- **The cursor-based sequence matching** (`content-models.md:23-33`) was implementable in about 25 lines with
  no guesses beyond GAP-15. The no-backtracking rule makes the behaviour predictable.
- **Kebab-case in shapes, camelCase in data and addresses**, with source names in messages and data names in
  addresses (`writing.md:42`), was unambiguous.
- **Lists written as text** (split on commas, trim; data must use arrays) was clear and testable.
- **Reserved names** are given as one list.
- **The selector grammar** (EBNF, any versus `all:`, negating the whole clause, two-valued logic for missing
  values, the first-colon rule) was the best-specified part of both repositories. Clauses through references
  worked first time.
- **The resolution order** (qualified, then `to`-constrained, then id, then former id, then name), and the
  distinction that `to` names shapes while `of` and qualifiers name collections, were both clear.
- **The split of `record` and `links`** (`corpus.md:542-547`) made inverses and rules straightforward.
- **Rule semantics** (`when` only reports the state; `when` with `require` reports `when` and not `require`;
  ids scoped by shape) were clear.
- **The core finding ids and severities** for the cases exercised were all present in the catalogues.
