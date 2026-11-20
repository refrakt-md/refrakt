{% spec id="SPEC-201" status="draft" tags="content-model, resolver, validation, language-server, write-path, marquise" %}

# Content models match in order, without backtracking: the algorithm, and what a shape's analysis reports

## Summary

The content-model resolver (`packages/runes/src/lib/resolver.ts`) decides how every rune's Markdown
becomes named fields, and so every record, every rendered prop and, later, every write. Its rules live
only in code and in comments scattered across SPEC-182 and SPEC-186. This spec writes them down as the
**normative matching algorithm**, unchanged, and adds a **static analysis** run when a shape loads, which
reports fields that can never match and fields that hide others.

The algorithm is already deterministic: ordered, greedy, forward-only, with no backtracking, as a parsing
expression grammar (PEG) is. What it lacks is visibility. Refrakt's own `hero` has an optional `blurb`
paragraph followed by a `body` that also takes paragraphs; the first paragraph after the headline is
always the blurb, by design, so a hero with no blurb whose body starts with a paragraph cannot be written
by inference at all. Nothing tells the shape's author, the language server or a tool writing content.

Part of the content-model revision (`notes/marquise-foundation.md`, section 17), and step 1 of
SPEC-199's order: refrakt builds against this algorithm, and Marquise ships it.

## Context

- **Raised by** the outside review of the Marquise concept docs (`notes/marquise-review-2026-11-18.md`,
  finding B7 and fresh perspective 1), which proposed XML Schema's unique particle attribution rule.
  Decided against: that rule would reject `hero` and the "first paragraph is the blurb" idiom refrakt's
  content relies on (`notes/marquise-foundation.md`, X3).
- **The resolver today**, read 2026-11-19:
  - `resolveSequence` (`resolver.ts:356`) walks the **fields**, not the nodes: each field looks only at
    the node under the cursor; a match takes it and advances; an optional field that does not match is
    skipped and the node stays for the next field; a required field that does not match is reported
    missing and also leaves the node (SPEC-186 D4.2);
  - `takeField` (`:208`): `greedy` takes the whole run of matching nodes; a paragraph field with an item
    model takes the paragraph only when the record's required fields are found (SPEC-182 D1, D3), a
    content check beyond the node's type;
  - `takeGroup` (`:333`): every required member must match or the group takes nothing; "no backtracking:
    each member is tried once, where it stands";
  - `position: last` reserves the container's final significant node before the other fields read
    (SPEC-186 D3);
  - `resolveDelimited` (`:428`): split at delimiter nodes into groups; named zones read groups by index,
    except that a single group goes to the `primary` zone; groups beyond the declared zones are unmatched;
  - `resolveSections` (`:632`): the section heading level is fixed (`heading:2`) or detected from the
    first two headings; content before the first section heading is the preamble, read by `fields`;
  - `resolveListItems` (`:842`): item fields do not read in order: each takes the first unconsumed inline
    node of its type, in the order the fields are declared, then `text` fields read what is left;
  - `matchesType` (`:136`): `any`, alternatives with `|`, `heading:N`, `list:ordered`,
    `list:unordered`, `tag:NAME`, `image` (which also accepts a paragraph holding only an image), and
    plain node types.

## Decisions

### D1: the matching algorithm is normative, as it is

The behaviour above is the specified behaviour, written as rules a second implementation can follow:

1. **A sequence reads fields in declared order, with one cursor over the container's children,** after
   special tags (`tint`, `bg`) are taken out. **The cursor skips insignificant nodes** (comments, soft
   breaks, blank text) wherever they occur, so every rule below reads "the next significant node"; they are
   never reported as unmatched, never reach a field, and are kept by writes (*decided 2026-11-19*, D6).
2. **A field looks only at the node under the cursor.** If the node matches the field's `match`, and its
   content check (if any) passes, the field takes it and the cursor advances. Otherwise the field takes
   nothing and the cursor stays.
3. **A field that takes nothing** is absent if optional, and reported missing (`content-missing`) if
   required. Either way the next field reads the same node.
4. **A repeated (`greedy`) field takes the whole run** of consecutive matching nodes from the cursor, at
   least one; it never stops early to leave a node for a later field.
5. **A group** tries its members in order from the cursor. If every required member takes something, the
   group takes everything its members took; otherwise it takes nothing and the cursor stays.
6. **`position: last`** is resolved first: the container's last significant node is offered to that field,
   and removed from the sequence if taken.
7. **Nothing is retried.** No field is offered a node twice, and no earlier field gives a node back.
8. **Nodes left when the fields run out** are unmatched (`content-unmatched`), handled by the shape's
   leftover policy.
9. **A split model** (delimited zones, sections) divides the container first, then reads each part as a
   sequence by these rules. A single part goes to the `primary` zone; parts beyond the declared zones are
   unmatched. Section-level detection is part of the split and specified with it.
10. **An item model** reads one list item's inline content: each field, in declared order, takes the first
    node of its type not yet taken; `text` fields then read the remaining text. Order of the inline nodes
    does not matter, only their order among nodes of the same type. *Decided 2026-11-19:* this order-free
    reading is normative, since reading should be more tolerant than writing; a write template (after
    Marquise 1.0) orders only *new* items, edits to existing ones change a field in place and keep the
    author's order, and reading derived from a template is order-free too.

Consequences that follow and are intended: the same input always gives the same fields; matching is
linear in the number of nodes, safe on untrusted content; one node of lookahead decides everything, so
content can be matched as it streams.

**Alternatives considered:**

- **Backtracking** (regular-expression style: find any assignment that satisfies the required fields). It
  would rescue cases such as `eyebrow?: paragraph` before `headline: paragraph` with a single paragraph,
  which today leaves `headline` missing. Rejected: authors could no longer predict a field from the text
  before it; worst cases are exponential on untrusted text; streamed content would reassign fields
  already shown; and the write path could not invert it. The analysis (D2) reports exactly the cases where
  backtracking would differ, so the shape's author can fix the model instead.
- **XML Schema's unique particle attribution** (reject any model where a node could belong to two
  fields). Rejected as the default: it forbids shadowing that shapes use on purpose (D2). Kept as the
  strict default (D3).

### D2: a shape's analysis, run when it loads

For every field the analysis computes its **start set** (the node types it can take first, with content
checks treated as "may match") and, for each optional or repeated field, the fields reachable after it
without passing a required field. Two findings follow:

| Finding | When | Severity |
|---|---|---|
| `field-unreachable` | no input can ever give the field a node, because earlier fields always take every node it could match (for example a repeated `any` before it in the same sequence) | error |
| `field-shadowed` | an optional field's start set overlaps a later reachable field's, so content meant for the later field is taken by the earlier one whenever the earlier one is empty | **error** by default (D3); **info** when the overlap is acknowledged with `shadows:` (D3); in a lenient shape or project, info, or **warning** when the later field is required, since content can then be rejected that a different model would accept |

Each finding names both fields, the overlapping node types, and the consequence in words: "A paragraph
after the headline always becomes `blurb`; a `body` that starts with a paragraph needs `blurb`, or an
explicit `#body` slot."

Overlaps are computed with the matcher vocabulary's real relations, not by name: `any` overlaps
everything; `image` overlaps `paragraph` (a paragraph holding only an image); `heading` overlaps every
`heading:N`; `list` overlaps `list:ordered` and `list:unordered`.

**Worked example.** `intro?: paragraph`, `body?: any` (repeated), `outro?: paragraph`:

- `intro` shadows `body` (an error, unless `intro` declares `shadows: [body]`: a body starting with a
  paragraph needs an intro or an explicit slot);
- `outro` is unreachable (error: `body` takes every node after the intro, including the last paragraph).

The fix is visible from the findings: make `outro` `position: last`, or narrow `body`.

### D3: strict by default, deliberate shadowing acknowledged

*Revised 2026-11-19* (`notes/marquise-foundation.md`, Y1; first written as an opt-in strict mode).
**Content models are strict by default:** `field-shadowed` is an error, so every node can be attributed to
exactly one field whichever optional fields are present (XML Schema's rule). The guarantee: **everything a
strict shape can hold can be written by inference alone,** so the write path never falls back to an
explicit slot.

**Deliberate shadowing is acknowledged per overlap,** on the earlier field:

```yaml
content:
  sequence:
    headline: { match: heading, as: inline }
    blurb:    { match: paragraph, optional: true, as: inline, shadows: [body] }   # on purpose
    body:     { match: any, repeat: true, optional: true }
```

An acknowledged overlap is reported as **info**: still shown on hover, known to the write path (which
predicts the explicit-slot fallback) and described in the published schema, so nothing is hidden; it is
declared where a reader of the shape sees it. `shadows:` naming a field the analysis finds no overlap with
is itself a finding, so acknowledgments do not go stale. `field-unreachable` stays an error always.

**`strict: false`,** per shape or as a project setting, is the escape hatch for migrating existing content:
`field-shadowed` becomes info (warning when the later field is required), as the analysis first reported
it.

**Why strict by default:**

- **It keeps both directions open.** Relaxing strict later is additive; tightening lenient later makes
  shapes that loaded fail, a major release and a migration for every shape library. The shape-file format
  freezes at Marquise 1.0.
- **Marquise's authors cannot see the shape.** Marketers, writers and models write against someone else's
  shape; a shadowed field is what they trip over ("my body paragraph became the blurb").
- **The write path's strongest guarantee,** and a quality bar for third-party shape libraries.
- Shadowing that is good design (refrakt's hero: "the first paragraph after the headline is the blurb")
  costs one declared `shadows:`, not turning checking off for a whole shape.

**In refrakt:** the project starts with `strict: false`, so nothing breaks; the review this spec's
acceptance criteria require turns each kept overlap into a `shadows:` annotation; then refrakt turns strict
on.

### D4: what the analysis serves

- **Shape authors:** the findings above, and in the language server a hover on each field explaining what
  it takes ("the first paragraph after the headline; later paragraphs go to `body`").
- **The write path** (after Marquise 1.0): it knows before editing when a value can only be written with an
  explicit slot, so the round-trip rule's fallback is predicted rather than discovered.
- **Completions:** what may come next at the cursor is the union of the start sets of the remaining fields
  up to the next required one.
- **Validation while streaming:** a field is complete once the next node does not match it, so every
  finding can be decided as content arrives except `content-missing`, which waits until the tag closes.
- **The published schema:** start sets and shadowing are part of the input grammar it describes.

### D5: compact forms and item models follow the same rules

They are matched by D1.10 and analysed by D2: two item fields whose types overlap take successive
occurrences in declared order, reported as `field-shadowed` when the second is required.

### D6: comments, and the defect they expose

*Added 2026-11-19*, from a test of the resolver against Markdoc 0.5.13 (`notes/marquise-foundation.md`, Y12).
Markdoc produces `comment` nodes only when its **tokenizer** is created with `allowComments: true` (the
option passed to `parse` has no effect), and refrakt's parser (`packages/runes/src/parse.ts:17`) does not
enable it. Two failures follow, in a `hero` holding an optional `eyebrow` paragraph and a `headline`:

- **Comments off (refrakt today):** `<!-- draft -->` is plain text, a paragraph. It becomes the eyebrow and
  is **rendered visibly**; "New in 2.0" has no field left; the headline is reported missing. (Markdoc has no
  `{% comment %}` tag either: it is an undefined tag.)
- **Comments on:** the comment is a `comment` node among the tag's children, and the cursor does not skip
  it. The eyebrow tries it and is skipped, the headline tries it and is reported missing, and the real
  paragraph and heading are both reported unmatched: **one comment breaks the whole tag.**

**Decided:** comments are enabled (`<!-- … -->`), the cursor skips insignificant nodes (D1.1), and
comments never reach records or rendering, while writes keep them (they are part of what the source holds
beyond the record). In refrakt, enabling comments changes behaviour: a `<!-- -->` that rendered as visible
text disappears, as its author meant; noted in the changelog.

### D7: deferred children match by what they yield

A deferred shape (a corpus layer's `collection`, filled after every document is loaded) can stand inside
another shape's content, where data's `{% data %}` stands today because it runs before reading:

```markdoc
{% accordion %}
	{% accordion-item title="How do I reset my password?" %}…{% /accordion-item %}

	{% collection "faq" filter="topic:billing" sort="order" %}
		{% accordion-item title=$item.question %}
		{% $item.answer %}
		{% /accordion-item %}
	{% /collection %}
{% /accordion %}
```

1. **A deferred shape declares what it yields:** its template's top-level tag, or without a template the
   collection's shape. It is known from the source, before any query runs.
2. **The matcher treats a placeholder as zero or more of what it yields,** as a run inside a repeating
   field, beside hand-written items. The parent resolves in the first phase like any shape.
3. **A mismatch is a finding at load,** `deferred-yield-mismatch` ("yields `card`, `accordion` takes
   `accordion-item`").
4. **Filling substitutes in place,** in the same field, with nothing read again; checks that depend on how
   many items there are (`min`, `content-missing`) run after filling, on the snapshot, at the placeholder's
   address.
5. **Restrictions:** a deferred shape inside another shape's content yields explicit tags, one top-level tag
   per item (`deferred-yield-untyped` otherwise, with the fix of wrapping it in its tag; at a document's top
   level any template is allowed); and a placeholder stands only where its matcher repeats, unless
   `limit=1`, where it may fill one optional position.
6. **A record keeps the query, not its results** (`Deferred<AccordionItemRecord>`): results depend on the
   corpus, and records stay the entity's own data. Rendering uses the filled tree.
7. **Filled content is generated,** so edits inside it are redirected to the source entity or refused.

Additive for 1.0: without placeholders, matching is unchanged. Built with deferred shapes (after Marquise
1.0; needed by Rivière 0.x). In refrakt it lets `collection` compose inside `accordion`, `tabs` and `bento`,
replacing `group-display="accordion"`, which hand-builds accordion markup today.

## Acceptance criteria

- [ ] A specification of the matching algorithm (D1) is written in the content-model docs, with an example for each rule, and the resolver's comments refer to it
- [ ] The resolver's existing tests are checked against D1, and a test is added for each rule that no test covers
- [ ] Refrakt's tokenizer enables comments; the resolver's cursor skips insignificant nodes; a test covers each failure in D6 (comments off and on), and the changelog notes that `<!-- -->` no longer renders as text
- [ ] Item models read order-free (D1.10), with a test that two orders of the same item give the same record
- [ ] The analysis (D2) runs when a definition loads and reports `field-unreachable` (error) and `field-shadowed` (error by default; info when acknowledged; in a lenient shape or project, info, or warning when the later field is required), naming both fields, the overlapping node types and the consequence
- [ ] Overlaps use the matcher relations: `any`, `image` and `paragraph`, `heading` and `heading:N`, `list` and its kinds, alternatives
- [ ] The worked example in D2 produces exactly the two findings described
- [ ] The analysis is run over every rune and definition in refrakt, with the project set to `strict: false`; every `field-unreachable` is fixed, and every `field-shadowed` is reviewed and either acknowledged with `shadows:` or fixed; then refrakt's project turns strict on
- [ ] `shadows: [field]` on the earlier field turns that overlap's finding into info; a `shadows:` naming a field with no overlap is reported
- [ ] `strict: false`, per shape and as a project setting, turns unacknowledged `field-shadowed` into info (warning when the later field is required)
- [ ] The language server shows each field's explanation on hover
- [ ] D7 is specified in the content-model docs: a placeholder matches as zero or more of what it yields, with `deferred-yield-mismatch` and `deferred-yield-untyped`, and counts checked after filling; refrakt's `collection` composes inside `accordion` with a test
- [ ] The resolver records a trace of its decisions (the nodes each field took and the rule that sent them there, and dropped nodes with their finding); `refrakt inspect --explain` (Marquise's `marquise explain`) prints it, and the language server shows it as inlay hints. The trace's JSON form is not a contract yet

## Open questions

1. **Section-level detection** looks at the first two headings and counts those at the second level, so
   adding one heading can change how the whole content splits. *Partly answered 2026-11-19* (notes Y13):
   not allowed in nested sections, and a finding in strict shapes; kept, reported, for a top-level split in
   lenient shapes.
2. **Item models are order-free** (D1.10) while write templates for compact forms read in template order.
   *Answered 2026-11-19 (D1.10):* reading stays order-free, also when derived from a template; templates
   order only new items.
3. **Content checks** (an item model's required fields on a paragraph) make a start set "may match". Is
   that precise enough for D2, or should content checks be part of the overlap computation?
4. **Insignificant nodes under the cursor.** *Answered 2026-11-19 (D6):* a defect, confirmed by test; the
   cursor skips them, and comments are enabled.

## References

- {% ref "SPEC-182" /%}: paragraph fields with item models
- {% ref "SPEC-186" /%}: groups, `position: last`, required fields reported when missing
- {% ref "SPEC-199" /%}: Marquise; the content-model revision as step 1 of the order
- {% ref "SPEC-200" /%}: what a field delivers (`as`)
- `notes/marquise-foundation.md`: section 17 (the content model with fresh eyes), section 21 and X3 (the
  outside review)
- `notes/marquise-review-2026-11-18.md`: finding B7, fresh perspective 1

{% /spec %}
