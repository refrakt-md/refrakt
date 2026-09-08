{% work id="WORK-529" status="done" priority="high" complexity="moderate" source="SPEC-125" tags="runes,config,sections,marketing" milestone="v0.31.0" pr="refrakt-md/refrakt#591" %}

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

- [x] Each of the three runes is individually assessed: is the missing role an
      oversight, or is the slot deliberately not a semantic section?
- [x] Corrections are applied only where the role genuinely belongs; a decision
      not to add one is recorded with its reasoning
- [x] Each correction has a test asserting the new `data-section` and, for a
      `body` role, that `reading`/`dropcap` now land on it
- [x] The rendered-output change for each rune is enumerated in the resolution —
      this is **not** output-neutral
- [x] `refrakt contracts` is regenerated; the `unavailable` entries for the
      affected runes disappear, and nothing else in the contract moves
- [x] A changeset records the visible change for theme authors
- [x] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

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

## Resolution

Completed: 2026-09-07

Branch: `claude/milestone-v0-31-0-e5ihxr`

### Per-rune assessment

**`Card` → add `body: 'body'`.** Oversight, not a deliberate omission. The content model is literally "`body` (optional, repeatable any block)"; the slot is the card's main content region and the layout groups it with eyebrow/footer under `content`. **No `title` role added**, deliberately: card's leading heading is a *child* of the body div (`refs.title` points inside `refs.body`), so a title role would nest one section inside another and, because `.rf-card__title` sets only `margin-top`, `[data-section="title"]`'s `font-size: var(--rf-title-size)` would resize every card heading. That is a structural change, not a data correction.

**`BentoCell` → add `body: 'body'` and `title: 'title'`.** Same body reasoning. Unlike card, the cell's heading is a *sibling* slot of its body, so the title role is a peer section and the standard pattern applies. Noted below that `prominence` is now declarable but inert under Lumina.

**`AccordionItem` → add `body: 'body'`; no header-ish role.** The header decision is recorded reasoning, not an omission:
- `header` is documented as the chrome metadata row and carries `margin-bottom: 3rem` — a 3rem gap under every accordion summary.
- `title` would tighten every summary's line-height while leaving `prominence` inert anyway, because `.rf-accordion-item__header` pins `font-size: var(--rf-text)` (it is a disclosure control, sized by the accordion's own design, not by a page-section type register). Granting an axis in the contract that the skin makes inert is worse than the honest exclusion.
- A `<summary>` is a disclosure control, not a page-section header; an accordion item has no page-section anatomy to scale.

The `body` role on `AccordionItem` is **beyond the work item's table**, which listed only a header-ish role for it. SPEC-125 derived its body list from runes declaring a `body` slot *in their layout*, and `AccordionItem` has no `layout` config — its slots come from `autoLabel` plus the schema — so the audit method structurally could not see it. Left undeclared it would have been flagged as drift by the WORK-532 lint anyway.

### Rendered-output changes

Three attributes, and nothing else in the 132-rune contract moved:

| Rune | Added |
|---|---|
| `card` | `data-section="body"` on `.rf-card__body` |
| `bento-cell` | `data-section="body"` on `.rf-bento-cell__body`, `data-section="title"` on `.rf-bento-cell__title` |
| `accordion-item` | `data-section="body"` on `.rf-accordion-item__body` |

Contract `unavailable` deltas — exactly the intended ones, all other runes untouched:

- `Card` — `reading`, `dropcap` removed (root and the `media-position=cover` variant). `prominence` correctly stays unavailable.
- `BentoCell` — `reading`, `dropcap`, `prominence` removed. `content-place`/`cover` correctly stay (no such modifiers).
- `AccordionItem` — `reading`, `dropcap` removed. `prominence` and `frame` correctly stay.

### Visual verification

Not assumed — measured. A headless Chromium run against the bundled Lumina stylesheet rendered identical markup with and without the new attributes and diffed the computed styles (display, type, colour, box metrics, margins, padding, gaps, borders) plus the client rect of every element, at `full`, `compact` and `minimal` density. Result: **no computed-style or box change on any of the three runes.** `[data-section="body"]`'s `line-height: relaxed` and `color: text` are already the values inherited from `html`, and `[data-section="title"]`'s type is outranked by the later `.rf-bento-cell__title`.

The new capability was verified positively too — `dropcap` on a card takes its first letter from 16px to 56px, where before it did nothing.

### One regression found and fixed

At `density="minimal"`, `[data-density="minimal"] [data-section="body"] { display: none }` would have hidden a card's **title** along with its prose, because card nests the title inside its body — the card would have rendered as an empty surface. Fixed in `packages/lumina/styles/dimensions/density.css`: where a title is nested in the body, keep the body box and hide only its other children, with a matching entry in the nested-density reset block so a full-density card inside a minimal container is unaffected. Verified in the browser across all three densities and the nested case.

Net effect is an improvement: `{% card density="minimal" %}` previously did nothing at all (card declared no roles minimal keys on); it now shows title-only, which is what minimal density means.

### Files changed

- `packages/runes/src/config.ts` — `Card.sections`, `AccordionItem.sections`, each with its reasoning inline
- `plugins/marketing/src/config.ts` — `BentoCell.sections`
- `packages/lumina/styles/dimensions/density.css` — body-nested-title handling at minimal density
- `packages/runes/test/section-roles.test.ts` (new, 8 cases) — full schema→engine pipeline against the real `baseConfig`; asserts each new `data-section`, that `reading`/`dropcap` land, and that the two deliberate non-corrections stay unroled
- `plugins/marketing/test/bento-cell-sections.test.ts` (new, 5 cases) — same for the cell, including `prominence` now being accepted rather than dropped
- `contracts/structures.json` + `packages/lumina/contracts/structures.json` — regenerated, in lock-step
- `.changeset/eighty-pugs-swim.md`

### Notes

- **`prominence` is inert on `bento-cell` under Lumina.** The axis re-points `--rf-title-size`, but `.rf-bento-cell__title` pins `font-size: var(--rf-text-lg)` directly, so the cascade never reaches it. Per ADR-028 that is the skin's business, not a reason to withhold the structural role — but it is worth a follow-up in Lumina, and the same shape will recur on any rune whose stylesheet pins its own title size.
- Verified: `npm run build` clean, full suite 4098/4098 across 335 files, `refrakt contracts --check --site main` up to date.
- The `pr` attribute is not set — no pull request was opened for this branch.

{% /work %}
