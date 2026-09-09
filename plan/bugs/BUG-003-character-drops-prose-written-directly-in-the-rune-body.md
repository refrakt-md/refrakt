{% bug id="BUG-003" status="fixed" severity="major" source="SPEC-125" tags="runes,storytelling,content-model" milestone="v0.32.0" pr="refrakt-md/refrakt#594" %}

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

## Resolution

Completed: 2026-09-09

Branch: `claude/milestone-v0-31-0-e5ihxr`
PR: refrakt-md/refrakt#594

### What was wrong

Two defects, either of which alone would have lost the prose.

1. **The field was never read.** The content model's greedy prose field was named
   `header` and matched `heading|paragraph`; `transform` referenced
   `resolved.portrait`, `resolved.items` and `resolved.sections`, never
   `resolved.header`. The prose was resolved and discarded.
2. **The body was built from the wrong cursor, and conditionally.**
   `const body = !hasSections ? sectionNodes.wrap('div') : undefined` — the
   *items* cursor, and only when the character had no sections. So even had the
   field been read, lead prose and sections could not coexist.

### The fix

`plugins/storytelling/src/tags/character.ts` now matches its siblings:

- The field is `description`, matching `paragraph`. Dropping `heading` from the
  match costs nothing — a heading in the preamble starts a section, so it never
  matched there.
- `buildStoryContent(...)` replaces the bespoke body assembly. It is the helper
  `realm` and `faction` already use, so the three shapes now share one
  implementation rather than three that agree by inspection. `extraDescription`
  is empty for Character: it extracts its portrait from an `image` field
  directly, so unlike Realm's `extractScene` there is no leftover text.
- `refs` and `children` emit `body` and `sections` independently instead of one
  or the other.

`plugins/storytelling/src/config.ts` — the content column is now
`['preamble', 'metadata', 'body', 'sections']`, matching Realm and Faction. The
old order had `sections` first, which was invisible while the two were mutually
exclusive and would have put lead prose *after* its own sections once they
could coexist.

### Tests

`plugins/storytelling/test/character-body.test.ts` (5) — prose renders; the
three sibling runes agree on identical markup (a control, so a regression on any
of them reads as a difference between them rather than three assertions that
rot separately); lead prose and sections coexist; no prose still emits no body
slot; and a portrait alongside prose leaves both intact, since they are adjacent
fields in the content model.

Direction-checked: 4 of the 5 fail against the pre-fix code.

One wrinkle worth recording — the first draft of the "no prose, no body slot"
case passed against the *wrong node*. `character-section` has a body slot of its
own, so an unscoped tree search finds a section's body on a character that has
none. The test now walks only as far as the next `data-rune`.

### Notes

- The only structure-contract change is the two-line layout reorder; no rune's
  emitted attributes or classes moved.
- This makes Character's `body` section role meaningful in practice. WORK-530
  declared it correctly and `data-reading` / `data-dropcap` did land on the slot
  — there was simply never any prose in it, which is why WORK-537 audited
  Character on intent rather than on output.

{% /bug %}
