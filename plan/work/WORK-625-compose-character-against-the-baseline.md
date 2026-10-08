{% work id="WORK-625" status="done" priority="high" complexity="complex" source="SPEC-145,SPEC-147" milestone="v0.40.0" tags="composition,storytelling,seo,spike" pr="refrakt-md/refrakt#686" %}

# Slice 2 — `character` as a composed rune, against the SEO baseline

{% ref "SPEC-145" /%}'s full worked example and its spike criterion. It is the first
composed rune with a `schema` row: `Person`, which a first-party definition may declare
under D25. It is also the first that uses `sections` with `each` and `$each.heading`, and
a preamble with an image slot.

`character` is the case {% ref "WORK-617" /%} was cancelled for. Its transform failed
SPEC-143's D4 family test, so it is replaced rather than declared. The composed
version drops the `character-section` child rune entirely.

Like {% ref "WORK-624" /%}, it ships beside the plugin ({% ref "SPEC-147" /%} D1). The
reference is the storytelling `character` fixture in `contracts/seo-baseline/`. The gate
is that every difference from it is explained, not that there are none (SPEC-147 D2).
Two differences are already decided:

- body content written alongside sections renders, where the plugin drops it;
- the `data-field="section"` stamp is gone.

Both come from SPEC-147 D6.

If the spike shows a decision in SPEC-145 does not hold, record it in the spec rather than
working around it here.

## Blocked by

- {% ref "WORK-624" /%}
- {% ref "WORK-630" /%}

## Acceptance Criteria

- [x] `character` is defined as a composed rune with a `Person` schema row, a `sections` slot placed with `each`, and the portrait and description preamble slots
- [x] Its JSON-LD is compared against the `character` fixture's recorded output in `contracts/seo-baseline/baseline.json`, and every difference is explained in writing (SPEC-147 D2)
- [x] One storytelling rune is reimplemented as a composed rune in a spike, and the emitted tree is compared against today's — not necessarily identical, but every difference explained
- [x] A composed rune's content-derived `properties` resolve — with `image: portrait` added to the row, the `image` from a slot-placed portrait reaches the entity, asserted against the graph and not just the attributes; the added property is an explained difference from the baseline (D10)
- [x] A composed `character` with both sections and other body content renders that content, and the plugin's discarding of it is recorded as an explained difference (SPEC-147 Finding 6, D6)
- [x] The composed `character` emits no `data-field="section"` on its sections (SPEC-147 D6)
- [x] The composed `character` registers the same entity, id, data and aliases as the plugin's, asserted against the storytelling registry snapshot
- [x] `plugins/storytelling/` is unchanged and still passing its own tests (SPEC-147 D1)

## Resolution

Completed: 2026-10-08

Branch: `claude/v040-composed-character` (stacked on `claude/v040-metablock`, #685)
PR: refrakt-md/refrakt#686

### What was done
- `packages/content/test/fixtures/composed-storytelling/runes/character.md`: the composed `character`, beside `bond`. It places `{% card %}` with the portrait in card's media zone, the name as card's title, `{% metablock name="metadata" /%}` for role and status, the description, a catch-all `body`, and each H2 section as `{% details %}` through `{% slot name="sections" each %}`. The `character-section` child rune is gone. Its schema row is `Person { name, role: jobTitle, portrait: image }`.
- Fixtures: `character.{canonical,portrait,body-and-sections}.md`.
- `packages/content/test/composed-character.test.ts` (27 tests). The JSON-LD comparison uses the SEO baseline generator's own `harvest()`.
- `packages/content/test/composed-storytelling.ts`: the fixture-plugin machinery, now shared with `composed-bond.test.ts`.
- SPEC-145: the `character` worked example is replaced by the measured definition, with a note on each change. The schema-bearing section records that `image` now resolves.
- SPEC-147 Finding 4: the cross-link constraint below.
- Not registered in `@refrakt-md/storytelling` (SPEC-147 D1); `plugins/storytelling/` has no diff.

### Against the baseline and the plugin
- JSON-LD: the `character` fixture publishes the recorded graph exactly, both `jsonLd` and `rendered.jsonLd`. The one RDFa difference: `name` is on a `<meta>`, not the title `<span>`. The title is template text, so the value rides the field bag.
- `image: portrait`: `"image": "veshra.jpg"` at both harvest points (D10). The plugin's row maps no portrait, which is the explained difference from the baseline.
- Registry: the snapshot's registrations, name index, types and warnings match exactly. Its links differ (finding 4).

### Rendered-tree differences (SPEC-147 D2), each asserted
**Same:** `data-rune`, `typeof`, `data-role`, `data-status`, `data-density`, the root `<article>`, and the metadata `<dl>` apart from classes.
1. No `rf-character*` class (D2/D2a); Lumina's `character.css` stops matching.
2. No `data-aliases` / `data-tags`. A generated config makes modifiers of enum attributes and of attributes a `metaFields` entry reads only. Registration is unaffected.
3. No `data-elevation="flat"` (plugin `defaultElevation`) and no `data-field="content-section"` (the plugin's `property`).
4. The metadata list has `rf-card__metadata` / `rf-card__row` classes: card's BEM pass reaches it.
5. The name is card's `<h1 data-name="title">` (with an `id`), not a `<span data-name="name">` in a preamble header.
6. Sections are `details` with content marked `data-slot="sections"`, not `character-section` runes, and there is no `sections` wrapper.
7. No `data-field="section"` (D6).
8. Content alongside sections renders; the plugin drops it (Finding 6, D6).
9. The description is a `<p data-slot="description">`, not a `body` div with `data-section`.
10. The portrait is in card's media zone (`<img data-slot="portrait" property="image">`), not a floated root `div[data-name=portrait][data-media=portrait]`. With no portrait there is no zone (D17).

### Findings
1. SPEC-145's example did not construct: `$each.heading` needs `emitAttributes` (D26). It also missed `tags` (`base` is not a definition key) and `aliases: [npc, pc]` (an `{% npc %}` page registered nothing), and it used badges, which its own authoring note rules out. All are corrected in the spec.
2. D11 gap: content that no preamble field matches is dropped silently. D11 checks that fields are placed, not that every node is matched. The stored definition adds a catch-all `body`, and a test pins the silent drop. Recorded in SPEC-145, not fixed here.
3. `image` resolves through the slot, in card's body or its media zone (after `extractMediaImage`).
4. The cross-links inside character pages are lost: the plugin's auto-linking skips nested runes, and the prose now sits inside `card`. Recorded in SPEC-147 Finding 4 as a constraint on D5.

### Notes
- No changeset: no package change ships. SPEC-147 D6's changeset note belongs to the change that ships composed runes.
- Contracts (both copies) and the SEO baseline are unchanged. `npm test`: 5532 passed.

{% /work %}
