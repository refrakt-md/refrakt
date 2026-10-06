{% work id="WORK-606" status="done" priority="medium" complexity="moderate" milestone="v0.38.0" source="SPEC-128" tags="runes,reference,docs,dx" pr="refrakt-md/refrakt#658" %}

# Project `itemModel` and render `emitTag` and `template` in the rune reference

For a rune whose primary syntax is a Markdown list, `refrakt reference`
documents that a list is accepted and nothing about what goes in it. Three facts
are lost at two points:

| Fact | Serialized? | Rendered? |
|---|---|---|
| `field.emitTag` | yes (`reference.ts:385`) | no |
| `field.template` | yes (`reference.ts:383`) | no |
| `field.itemModel` | **no** | no |

## Acceptance Criteria

- [x] `SerializedContentField` carries a projection of `itemModel`, including each item field's `match`, `extract`, and `pattern` (regex source as a string, or the literal `'remainder'`)
- [x] `renderField` renders `emitTag`, so a dual-syntax field states both what an author writes and what it becomes
- [x] The item grammar is rendered in a form that leads with the authoring shape, matching how the sections branch already reads
- [x] `field.template` is either rendered or removed — a hand-written snippet that nothing displays does not stay
- [ ] The loose `match: 'tag'` declarations that render as a bare "tag" are tightened to `match: 'tag:<name>'` where the rune accepts one specific tag
- [x] `refrakt reference playlist` and `refrakt reference cast` show enough to write a list item without reading the plugin source
- [x] The generated attribute tables (`site/content/_data/rune-attributes.json`) regenerate without unrelated drift

## Approach

The capability already exists one struct over. `SerializedSectionsModel` projects
`headingExtract` with `pattern` documented as "Regex source, or the literal
string `'remainder'`", and `knownSections` with aliases and `hasModel`. Project
`itemModel` the same way rather than inventing a second representation.

Tone: the sections branch renders the *authoring* shape — "Content is split into
sections by heading elements. Each section becomes one named block." Field-level
should read the same way, not as a dump of the model.

**A concrete trap this must surface.** `playlist`'s date pattern is
`/—\s*(.+)$/` — U+2014 EM DASH. A plain hyphen does not match, the field is
`optional`, so an author who types `-` gets no `date` and no warning. `cast`'s
own description sentence writes "Name - Role" with a hyphen. Rendering the
pattern is what makes this findable.

## Edge Cases

- A `pattern` that is a RegExp with flags — serialize the source, and decide whether flags are shown or dropped.
- Nested `itemModel` (`playlist`'s `cuePoints`) — render one level or recurse; one level is probably enough, but say which in the output.
- `match: 'text'` fields with no `pattern` — these consume remaining text implicitly and should not render as if they matched a node type.

## References

- {% ref "BUG-031" /%} — the bug this fixes
- {% ref "SPEC-128" /%} — generating rune attribute tables from the reference

## Resolution

Completed: 2026-10-06

Branch: `claude/v0-37-post-release-plan-dc3va1`

### What was done
- `packages/runes/src/reference.ts`: `SerializedContentField.itemModel` (new `SerializedItemField` / `SerializedItemModel`): match, optional, greedy, extract, `pattern` as regex source or `'remainder'`, `patternFlags`, nested models recursively.
- `renderField` leads with the authoring shape: `template` as "Written as", then "Each list item is read as:" with each item field in author terms (**bold** text, a link — its `href`, text matching `…`, the remaining text, a nested list), then "Each list item becomes `{% x %}`". Nested item models render one level and say so; a pattern-less `text` field reads as "the remaining text".
- A pattern containing a non-ASCII character names its code point — playlist's date field now reads "`—` is U+2014".
- `renderSectionsModel` also renders the sections-level `emitTag` ("Each section becomes `{% accordion-item %}`") — serialized and never printed, the same gap one level up.
- Tests: JSON round-trip of the projection, flags/remainder/nesting, an inline snapshot of the rendered grammar; the character-shape snapshot (a test already named "…and emitTag") now contains the emitTag.
- `content-models.md`: the `template` and `emitTag` rows.

### Notes
- **Not done, by decision on #658: tightening the eight preamble `match: 'tag'` fields to `tag:<name>`.** A greedy run stops at the first non-matching node, so `tag:x` would end at a stray tag and drop the matching items after it — new silent content loss, where today each rune's own filter drops only the stray tag. The reference names the child rune instead, via the sections-level `emitTag` line.
- `rune-attributes.json` regenerates with no drift; rendered rune output is byte-identical.

{% /work %}
