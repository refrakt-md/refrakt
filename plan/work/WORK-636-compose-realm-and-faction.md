{% work id="WORK-636" status="done" priority="medium" complexity="moderate" source="SPEC-147" milestone="v0.41.0" tags="composition,storytelling,seo" pr="refrakt-md/refrakt#694" %}

# `realm` and `faction` as composed runes

{% ref "SPEC-147" /%}: `realm` (`Place`) and `faction` (`Organization`) share `character`'s shape,
sections plus a preamble, and each has a `-section` child rune that composition removes. Their
media split maps to `{% mediatext %}`. Both follow {% ref "WORK-625" /%}'s pattern:

- beside the plugin (D1);
- compared against the registry snapshot and their SEO baseline fixtures, with every
  difference explained (D2);
- content written alongside sections renders, and no `data-field="section"` stamp is emitted
  (D6);
- role, type or scale metadata is placed with `{% metablock %}`, not with placed `badge` or
  `deflist` runes.

{% ref "SPEC-145" /%} D7's own worked example uses `realm`. Where the measured definition differs
from it, correct the spec, as WORK-630 did for `bond`.

If {% ref "WORK-631" /%} has landed, the definitions need no catch-all `body` field to keep
content. If it has not, they use one, as `character` does, and say so.

## Acceptance Criteria

- [x] `realm` and `faction` are each defined as composed runes with their schema rows, `sections` placed with `each`, and their declared meta blocks placed with `{% metablock %}`
- [x] Each one's JSON-LD is compared against its fixture's recorded output in `contracts/seo-baseline/baseline.json`, and every difference is explained (SPEC-147 D2)
- [x] Each registers the same entity, id, data and aliases as the plugin's rune, asserted against the storytelling registry snapshot
- [x] Content written alongside sections renders, and no `data-field="section"` is emitted (SPEC-147 D6)
- [x] The media split uses `{% mediatext %}`, or the reason it cannot is recorded
- [x] SPEC-145 D7's `realm` example matches the measured definition
- [x] `plugins/storytelling/` is unchanged and still passing its own tests (SPEC-147 D1)

## Resolution

Completed: 2026-10-08

Branch: `claude/v041-composed-realm-faction`
PR: refrakt-md/refrakt#694

### What was done
- `packages/content/test/fixtures/composed-storytelling/runes/{realm,faction}.md`: the composed runes, beside `bond` and `character`. Each places:
  - `{% card %}`, with the scene in its media zone and the name as its title;
  - `{% metablock name="metadata" /%}`;
  - the description, then a catch-all `body`;
  - each H2 section as `{% details %}`, through `{% slot name="sections" each %}`.

  The `-section` child runes are gone.
- Schema rows: `Place { name, type: additionalType, scene: image }` and `Organization { name, scene: image }`.
- Registered data: `[{ realmType: type }, scale, tags, parent, name]` and `[{ factionType: type }, alignment, size, tags, name]`.
- Aliases: `[location, place]` and `[guild, order]`.
- The `SplitLayoutModel` attributes are declared by hand and passed to card via `$attrs["media-position"]` and the rest.
- Realm's `type` defaults to `place`, as the plugin's meta does.
- Fixtures: `{realm,faction}.{canonical,body-and-sections,defaults}.md`.
- `packages/content/test/composed-realm-faction.test.ts` (64 tests, plus a file snapshot of both trees). The JSON-LD is measured with the SEO baseline generator's own `harvest()`.
- `composed-storytelling.ts`: `capture(pkg, dir?)`, the same edit as #690.
- SPEC-145 D7: the `realm` example is replaced by the measured definition, with a note on each change. The marker prose now says `card`.
- SPEC-147: Finding 6 gains a measured note; the table row and D2's parenthetical say `card`.
- Not registered in `@refrakt-md/storytelling` (SPEC-147 D1); `plugins/storytelling/` has no diff.
- WORK-633 had not merged, so the definitions are loaded as strings. WORK-631 had not merged, so each keeps a catch-all `body`.

### Against the baseline and the plugin
- JSON-LD: both fixtures publish the recorded graph exactly, at both harvest points, including `image`. The one RDFa difference is that `name` is on a `<meta>`. Defaults match the plugin's graph.
- Registry: for each rune, and with all four composed runes in one site, the snapshot's registrations, name index, types and warnings match exactly. Unset-attribute data bags match too, aliases register, and the nested `King Edric` still registers.
- Links: realm's are unchanged. Faction loses `King Edric -> /realms/aldermere`, because its prose is in `card` (SPEC-147 Finding 4).

### Rendered-tree differences (SPEC-147 D2), each asserted
**Same:**
- `<article>`, `data-rune`, `typeof`, `data-density`, `data-media-position` (which also reaches card);
- `data-scale`, `data-alignment` and `data-size` when set;
- the metadata `<dl>`, apart from classes and the type row's `data-field`.

**Different:**
1. No `rf-realm*` / `rf-faction*` classes. The metadata gets card's.
2. `data-type` and `data-field="type"`, not `data-realm-type` / `data-faction-type` and `realmType`, because modifiers are keyed by attribute.
3. No `data-tags` or `data-parent`. An unset optional modifier is absent rather than `""`.
4. No `data-elevation="flat"` and no `data-field="content-section"`.
5. The name is card's `<h1 data-name="title">`, which joins the page heading index (#690).
6. Sections are `details`: no `data-field="section"` (D6), no child rune, no `sections` wrapper.
7. Content alongside sections renders (Finding 6, D6).
8. The scene is in card's media zone (`img[data-slot=scene][property=image]`). With no scene there is no zone.
9. The description is `<p data-slot="description">`, not a `body` div.
10. `prominence` and the ten `frame-*` attributes are not accepted. A composition declares no `sections` and no `mediaSlots`.

### Findings
1. The split maps to `card`, not `mediatext`, contrary to SPEC-147. `mediatext` cannot carry `SplitLayoutModel` (the baseline's `media-position="start"` has nowhere to go). It also leaves an empty media zone with no scene, and it moves description images into the media zone without their `data-slot`. The tests keep the `mediatext` form as evidence.
2. The plugin drops a list written after the description, and everything after it, with or without sections. Finding 6 names only the sections case.
3. SPEC-145 D7's example did not construct: it had no `body` field and no `emitAttributes`. It also used a `realmType` attribute that no page writes.

### Notes
- No changeset: no package change ships.
- Contracts (both copies) and the SEO baseline are unchanged. `npm test`: 5596 passed.

{% /work %}
