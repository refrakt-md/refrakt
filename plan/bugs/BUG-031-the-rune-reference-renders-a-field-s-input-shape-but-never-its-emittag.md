{% bug id="BUG-031" status="confirmed" severity="minor" source="SPEC-128" tags="runes,reference,docs,emitTag,dx" %}

# The rune reference renders a field's input shape but never its `emitTag`

`reference.ts` serialises `emitTag` onto every content field (line 385) and then
never renders it. `renderField` (line 483) formats `name`, `optional`, `greedy`,
`match` and `description` — and stops:

```ts
function renderField(field: SerializedContentField): string {
	const required = field.optional ? 'optional' : 'required';
	const repeat = field.greedy ? ', repeatable' : '';
	const match = formatMatch(field.match);
	const desc = field.description ? ` — ${field.description}` : '';
	return `\`${field.name}\` (${required}${repeat} ${match})${desc}`;
}
```

So for a rune whose whole design is "a list item becomes a child rune", the
reference documents the list and stays silent about the rune.

## Steps to Reproduce

```bash
node packages/cli/dist/bin.js reference cast --site main
```

## Expected

Something naming both halves of the contract — what an author may write, and
what it becomes:

```
- `members` (optional, repeatable list → becomes `cast-member`)
- `items` (optional, repeatable `cast-member` tag)
```

## Actual

```
Content:
  - `header` (optional, repeatable heading or paragraph or image)
  - `members` (optional, repeatable list)
  - `items` (optional, repeatable tag)
```

`members` gives no hint that `cast-member` tags come out of it. `items` is worse
— it renders as a bare "repeatable tag" and never says *which* tag, so an author
reading the reference cannot discover that `{% cast-member %}` is the explicit
form of the same thing.

## Notes

- `formatMatch` already handles `tag:NAME` and prints `` `name` tag ``, so
  `items` renders as a bare "tag" only because `cast` declares `match: 'tag'`
  rather than `match: 'tag:cast-member'`. Two fixes are wanted, not one: render
  `emitTag`, and tighten the loose `match: 'tag'` declarations that make the
  other half unprintable.
- Section-level `emitTag` already does the right thing and is the model to copy.
  `character` renders *the authoring shape* rather than the machinery —
  "Content is split into sections by heading elements. Each section becomes one
  named block." Field-level should read the same way: lead with what to write,
  mention the emitted tag as the consequence.
- This is the visibility half of the same contract {% ref "BUG-030" /%} breaks
  at runtime. Together they mean the dual-syntax composition is neither
  documented nor reliable, which is a fair explanation for why `playlist`
  reimplemented it by hand.
- Severity `minor`: docs-only, no wrong output. But it is the surface an author
  learns the rune from, and the rune's own description sentence ("List items
  with \"Name - Role\" pattern become entries") is currently doing the work the
  generated field list should be doing.

## References

- {% ref "SPEC-128" /%} — generating rune attribute tables from the rune reference
- {% ref "BUG-030" /%} — the runtime half: a mixed field with `emitTag` drops the authored tags

{% /bug %}
