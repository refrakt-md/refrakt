{% bug id="BUG-031" status="confirmed" severity="minor" source="SPEC-128" tags="runes,reference,docs,emitTag,itemModel,dx" %}

# The reference drops the field-level authoring grammar

For a rune whose primary syntax is a Markdown list, `refrakt reference`
documents that a list is accepted and nothing about what goes in it. Three
facts are lost, at two different points in the pipeline.

## What is lost, and where

| Fact | Serialized? | Rendered? |
|---|---|---|
| `field.emitTag` | yes (`reference.ts:385`) | **no** |
| `field.template` | yes (`reference.ts:383`) | **no** |
| `field.itemModel` | **no** — absent from `SerializedContentField` | no |

`renderField` (`reference.ts:483`) formats `name`, `optional`, `greedy`,
`match` and `description`, and stops:

```ts
function renderField(field: SerializedContentField): string {
	const required = field.optional ? 'optional' : 'required';
	const repeat = field.greedy ? ', repeatable' : '';
	const match = formatMatch(field.match);
	const desc = field.description ? ` — ${field.description}` : '';
	return `\`${field.name}\` (${required}${repeat} ${match})${desc}`;
}
```

So two fields are carried all the way to the renderer and dropped there, and a
third never survives the projection.

## Steps to Reproduce

```bash
node packages/cli/dist/bin.js reference playlist --site main
```

## Expected

Enough to write a track without reading the source or reverse-engineering the
example.

## Actual

```
- `tracks` (required, repeatable list or `track` tag) — Track listing
```

The dual syntax is visible here (`formatMatch` handles `list|tag:track`), but
the list grammar is not. Every one of these is declared in `itemModel` and
appears nowhere in the output:

| Fragment | Declared as |
|---|---|
| `**Speak to Me**` | `{ name: 'name', match: 'strong' }` |
| `[Breathe](/tracks/breathe)` | `{ name: 'src', match: 'link', extract: 'href' }` |
| `*M83*` | `{ name: 'artist', match: 'em' }` |
| `(1:13)` | `pattern: /\((\d+:\d+(?::\d+)?)\)/` |
| `— March 1973` | `pattern: /—\s*(.+)$/` |

`cast` is worse still — its `items` field declares `match: 'tag'` rather than
`match: 'tag:cast-member'`, so it renders as a bare "repeatable tag" that never
names the rune an author would write.

## The trap this hides

The date pattern is `/—\s*(.+)$/` — **U+2014 EM DASH**, verified. A plain
hyphen does not match. The example uses the em dash but nothing states the
requirement, and the field is `optional`, so an author who types `-` gets no
`date`, no warning, and no way to find out why short of reading the plugin
source. `(1:13)` versus `1.13` fails the same way.

## Why this reads as an oversight rather than a decision

The **sections** side of the same file already projects its extraction grammar:

```ts
export interface SerializedSectionsModel {
	headingExtract?: { fields: SerializedHeadingExtractField[] };  // regex source, as a string
	knownSections?: Record<string, SerializedKnownSection>;         // aliases + hasModel
}
```

`SerializedHeadingExtractField.pattern` is documented as "Regex source, or the
literal string `'remainder'`". So the reference knows how to serialize and
describe pattern-based extraction, and does — for headings. `itemModel` is the
same shape of fact, one struct over, and was never projected.

Section-level rendering is also the model to copy for tone. `character` renders
the *authoring* shape, not the machinery:

> Content is split into sections by heading elements. Each section becomes one
> named block.

Field-level should read the same way: lead with what to write, mention the
emitted tag as the consequence.

## Notes

- Severity `minor`: docs-only, no wrong output. But this is the surface an
  author learns the rune from, and the hand-written `description` sentence is
  currently doing the job — `cast`'s reads "List items with \"Name - Role\"
  pattern become entries", which is the generated field list's work done by
  hand, and which itself uses a hyphen where the model wants an em dash.
- The only place the list grammar reaches a reader today is the example block,
  which comes from a fixture (`ctx.fixtures[name] ?? RUNE_EXAMPLES[name]`).
  Fixtures are validated — the corpus test parses, validates and transforms
  each one — so they cannot describe syntax the pipeline rejects. But they
  demonstrate *one* valid shape; they do not enumerate the grammar, and nothing
  requires a fixture to exercise every `itemModel` field. Playlist's fixture
  shows `(1:13)` and `— March 1973`; it does not show `*artist*`.
- `field.template` is the third restatement of the same syntax (6 declarations,
  e.g. playlist's `'- **Track Name** (3:45)'`). Either render it or delete it —
  a hand-written snippet that nothing displays is strictly worse than no field.
- Fixing this is one change to one path: widen `SerializedContentField`, then
  extend `renderField`. Both `emitTag` and `template` are already on the wire.
- **Not in scope, deliberately.** The block editor (`editor/src/server.ts:1022`)
  reads `RUNE_EXAMPLES` directly instead of the merged fixture map, so plugin
  runes get no example there at all. Recorded here rather than filed — that
  package is dormant and will be revisited on its own terms.

## References

- {% ref "SPEC-128" /%} — generating rune attribute tables from the rune reference
- {% ref "BUG-030" /%} — the runtime half: a mixed field with `emitTag` drops the authored tags
- {% ref "SPEC-003" /%} — the declarative content model whose grammar this fails to surface

{% /bug %}
