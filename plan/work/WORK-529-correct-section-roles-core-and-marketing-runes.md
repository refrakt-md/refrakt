{% work id="WORK-529" status="ready" priority="high" complexity="moderate" source="SPEC-125" tags="runes,config,sections,marketing" milestone="v0.31.0" %}

# Correct section roles — core and marketing runes

Three runes whose `sections` map is missing a role their layout clearly has.
`Card` is the case that surfaced the whole problem:

```js
sections: { media: 'media' },
layout: { root: ['media', 'content'],
          content: { tag: 'div', children: ['eyebrow', 'body', 'footer'] } }
```

Its content model is literally "`body` (optional, repeatable any block)" — body
text is the main thing a card contains — but the slot is never mapped to the
`body` role, so `applyBemClasses` never sets `data-section="body"` and
`data-reading` never lands. `{% card reading="prose" %}` does nothing, silently.

| Rune | Missing |
|---|---|
| `Card` | `body` role |
| `BentoCell` | `body` role **and** a header-ish role |
| `AccordionItem` | header-ish role (it has a `header` slot via `autoLabel`) |

`BentoCell` appears in both directions, which is why the audit is grouped by rune
family rather than by direction.

## Acceptance Criteria

- [ ] Each of the three runes is individually assessed: is the missing role an
      oversight, or is the slot deliberately not a semantic section?
- [ ] Corrections are applied only where the role genuinely belongs; a decision
      not to add one is recorded with its reasoning
- [ ] Each correction has a test asserting the new `data-section` and, for a
      `body` role, that `reading`/`dropcap` now land on it
- [ ] The rendered-output change for each rune is enumerated in the resolution —
      this is **not** output-neutral
- [ ] `refrakt contracts` is regenerated; the `unavailable` entries for the
      affected runes disappear, and nothing else in the contract moves
- [ ] A changeset records the visible change for theme authors
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

Adding a role adds `data-section`, which Lumina styles directly in
`styles/dimensions/sections.css` and `styles/dimensions/density.css`. Existing
sites will render these runes differently without doing anything, so each
addition needs its own justification — "the slot exists" is necessary but not
sufficient.

Check the rendered result visually, not only in tests: a card body picking up the
shared `[data-section="body"]` rules is the intended outcome, but it should be
confirmed rather than assumed.

## Blocked by
- {% ref "WORK-528" /%}

## References

- {% ref "SPEC-125" /%} — Phase 1, Direction 1
- {% ref "SPEC-108" /%} — reading register and dropcap

{% /work %}
