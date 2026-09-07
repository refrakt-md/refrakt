{% work id="WORK-530" status="done" priority="medium" complexity="moderate" source="SPEC-125" tags="runes,config,sections,storytelling" milestone="v0.31.0" %}

# Correct section roles — storytelling runes

Six runes in `plugins/storytelling`, in two families of three that will almost
certainly resolve the same way as each other:

| Rune | Missing |
|---|---|
| `Character`, `Realm`, `Faction` | `body` role |
| `CharacterSection`, `RealmSection`, `FactionSection` | header-ish role |

Grouped into one item because they are the same pattern three times over: the
three entity runes share a shape, and the three `*Section` child runes share
another. A judgement made for one should hold for its siblings, and making it
once is the point of grouping them.

## Acceptance Criteria

- [x] The three entity runes are assessed together; the decision and its
      reasoning apply consistently across them, or the divergence is explained
- [x] The three `*Section` child runes are assessed together on the same terms
- [x] Corrections are applied only where the role genuinely belongs
- [x] Each correction has a test asserting the new `data-section` and, for a
      `body` role, that `reading`/`dropcap` land on it
- [x] The rendered-output change for each rune is enumerated in the resolution
- [x] `refrakt contracts` is regenerated; the affected `unavailable` entries
      disappear and nothing else moves
- [x] A changeset records the visible change for theme authors
- [x] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

Worth a specific look: the `*Section` child runes are *sections of* an entity
rune, so "does this have a page-section header" is a different question for them
than for a top-level rune. `prominence` scales a page-section header — on a child
section that may be the wrong axis entirely, in which case the honest answer is
to leave the role off and let the contract keep recording it as unavailable.

`Realm` also has a media section already (`plugins/storytelling` styles
`[data-section="media"]` in `realm.css`), so it is the one entity rune where a
new `body` role interacts with existing role-based CSS. Check that pairing
visually.

## Blocked by
- {% ref "WORK-528" /%}

## References

- {% ref "SPEC-125" /%} — Phase 1, Direction 1
- {% ref "SPEC-107" /%} — prominence

## Resolution

Completed: 2026-09-07

Branch: `claude/milestone-v0-31-0-e5ihxr`

### Entity runes — `Character`, `Realm`, `Faction` → add `body: 'body'`

Assessed together and resolved identically, as the work item anticipated. All three share one shape: `sections: { preamble: 'preamble', name: 'title', <media-slot>: 'media' }` with a `body` slot placed by `layout.content` and an `editHints` entry for it — the slot was always there, the role never declared. `reading` and `dropcap` were silently dropped on all three.

Their header roles were already correct (`name` carries `title` inside a `preamble` header), so `prominence` already worked. Only `body` was missing. No divergence between the three.

### `*Section` child runes → add `body: 'body'`, **no** header-ish role

The work item's Approach flagged the header question as genuinely different for a child section, and it resolves against adding one — on three independent grounds:

1. **Hierarchy.** The parent entity's `name` already holds the `title` role. Giving each child section a second `title` inside the same subtree flattens exactly the hierarchy `prominence` exists to scale.
2. **It would be inert anyway.** `.rf-character-section__name`, `.rf-realm-section__name` and `.rf-faction-section__name` each pin `font-size`, `font-weight`, `line-height`, `margin-bottom` and `color` — every property `[data-section="title"]` sets — and rune CSS is imported after `dimensions/`, so it wins the tie. `prominence` re-points `--rf-title-size`, which would never reach these elements. Granting an axis the skin makes inert is worse than the honest exclusion.
3. **`prominence` is the wrong axis for a sub-section.** These are sections *of* an entity, not page sections.

The contract keeps recording `prominence` (and `frame`) as unavailable on all three, which is the accurate answer.

The `body` role on the `*Section` runes is **beyond the work item's table**, which listed only a header-ish role for them — the same finding as `AccordionItem` in {% ref "WORK-529" /%}, with the same cause: SPEC-125 derived its body list from runes declaring a `body` slot *in their `layout`*, and these three have no `layout` config, so the audit method structurally could not see them. Left undeclared they would be flagged as drift by the {% ref "WORK-532" /%} lint.

Incidental finding: `autoLabel: { span: 'header' }` on all three `*Section` runes is dead config. The schema already sets `data-name="name"` on that span, and `applyAutoLabel` only labels children that have no `data-name`, so no `data-name="header"` is ever emitted — which is also why their `editHints.header` entry never applies. Left alone here; it is unrelated to section roles and harmless.

### Rendered-output changes

One attribute on six elements, and nothing else in the 132-rune contract moved:

| Rune | Added |
|---|---|
| `character` | `data-section="body"` on `.rf-character__body` |
| `realm` | `data-section="body"` on `.rf-realm__body` |
| `faction` | `data-section="body"` on `.rf-faction__body` |
| `character-section` | `data-section="body"` on `.rf-character-section__body` |
| `realm-section` | `data-section="body"` on `.rf-realm-section__body` |
| `faction-section` | `data-section="body"` on `.rf-faction-section__body` |

Contract `unavailable` deltas — `reading` and `dropcap` removed on all six, nothing else. `prominence` correctly stays unavailable on the three `*Section` runes; `content-place`, `cover` and `frame` correctly stay where they were.

### Visual verification

Measured, not assumed. Headless Chromium rendered the same markup with and without the new attributes against the bundled Lumina stylesheet and diffed computed styles and box geometry for every element. **No change on any of the six.** None of the six stylesheets sets `line-height` or `color` on its body element, so `[data-section="body"]`'s declarations land — but they are already the values inherited from `html`.

The `realm` pairing the Approach singled out was checked explicitly, with the new `body` role rendered alongside the existing `data-section="media"` scene: unchanged.

### One pre-existing bug found — BUG-003

`Character`'s entity-level `body` slot is **always empty**. Its content model names the greedy prose field `header` and `transform()` never reads it, so prose written directly inside `{% character %}` is dropped. The body slot is built from the *items* cursor instead, which is empty when there are no child sections. `Realm` and `Faction` name the same field `description` and feed it into their body slot, which is why they are unaffected.

Filed as {% ref "BUG-003" /%} (major, milestone v0.32.0) rather than fixed here: this item corrects section-role *data*, while that fix makes vanished prose start rendering — a visible output change on its own terms, wanting its own test and changeset. The role added here is correct regardless and will be right the moment the schema is.

### Files changed

- `plugins/storytelling/src/config.ts` — six `sections` maps, with the reasoning inline (full note on `CharacterSection`, back-references on its two siblings)
- `plugins/storytelling/test/section-roles.test.ts` (new, 15 cases) — table-driven over both families so a sibling that diverges fails its own row; asserts each new `data-section`, that `reading`/`dropcap` land, that the pre-existing header roles are untouched, and that the `*Section` names stay unroled
- `plan/bugs/BUG-003-*.md` (new)
- `contracts/structures.json` + `packages/lumina/contracts/structures.json` — regenerated, in lock-step
- `.changeset/olive-crabs-invite.md`

### Notes

- The entity runes emit **either** a `body` slot **or** a `sections` container, never both, so the tests use a source without `##` headings for the body assertions and one with them for the child-section assertions. Worth knowing before touching these runes.
- Verified: `npm run build` clean, full suite 4113/4113 across 336 files, `refrakt contracts --check --site main` up to date.
- The `pr` attribute is not set — no pull request was opened for this branch.

{% /work %}
