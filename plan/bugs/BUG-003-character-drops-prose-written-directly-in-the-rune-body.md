{% bug id="BUG-003" status="confirmed" severity="major" source="SPEC-125" tags="runes,storytelling,content-model" milestone="v0.32.0" %}

# Character drops prose written directly in the rune body

Found while auditing section roles for {% ref "WORK-530" /%}: `Character`'s
entity-level `body` slot is emitted, placed by `layout`, and **always empty**.
Prose an author writes directly inside `{% character %}` never reaches the
output.

`Realm` and `Faction` — the two runes that otherwise share Character's exact
shape — handle the same content correctly, which is what makes this a bug rather
than a design choice.

## Steps to Reproduce

```md
{% character name="Veshra" %}
Prose about Veshra.
{% /character %}
```

## Expected

The paragraph renders inside the character's body slot, as the identical shape
does on `{% realm %}` and `{% faction %}`.

## Actual

The body slot is emitted as an empty `<div data-name="body">` and the paragraph
is gone. No warning, no error.

## Cause

`plugins/storytelling/src/tags/character.ts` names its greedy prose field
`header` and then never reads it:

```ts
fields: [
  { name: 'portrait', match: 'image', optional: true },
  { name: 'header', match: 'heading|paragraph', optional: true, greedy: true },
  { name: 'items', match: 'tag', optional: true, greedy: true },
],
```

`transform()` references `resolved.portrait`, `resolved.items` and
`resolved.sections`, but never `resolved.header`. The body slot is then built
from the *items* cursor rather than from any prose:

```ts
const body = !hasSections ? sectionNodes.wrap('div') : undefined;
```

so with no child sections and no child tags it wraps nothing.

Realm and Faction name the same field `description` and feed it into their body
slot, which is why they are unaffected. The fix is to make Character match its
siblings.

## Impact

Content silently disappears — the failure mode {% ref "SPEC-125" /%} exists to
remove. It also makes Character's new `body` role (added in
{% ref "WORK-530" /%}) inert in practice: the role is correctly declared and
`data-reading` / `data-dropcap` land on the slot, but there is never any prose
in it for a reading register to style. A character's visible prose lives in its
`{% character-section %}` children, which carry their own body role.

## Notes

Not fixed in {% ref "WORK-530" /%} deliberately. That item corrects section-role
*data*; this is a content-model defect whose fix makes prose that currently
vanishes start rendering — a visible output change on its own terms, and one
that wants its own test and changeset rather than riding along with an audit.

## Environment

- `@refrakt-md/storytelling` 0.30.1 (present since the rune was written)

{% /bug %}
