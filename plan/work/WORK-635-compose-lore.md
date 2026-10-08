{% work id="WORK-635" status="done" priority="medium" complexity="simple" source="SPEC-147" milestone="v0.41.0" tags="composition,storytelling,seo" pr="refrakt-md/refrakt#690" %}

# `lore` as a composed rune

{% ref "SPEC-147" /%} lists `lore` as the simplest storytelling rune. It has a title, a body, an
`Article` schema row (`title` → `headline`, `category` → `articleSection`) and a registered
entity. It follows the pattern {% ref "WORK-624" /%} and {% ref "WORK-625" /%} set:

- it ships beside the plugin as a fixture definition in
  `packages/content/test/fixtures/composed-storytelling/runes/` (SPEC-147 D1);
- it is compared against the plugin's output, the storytelling registry snapshot and the
  `lore` SEO baseline fixture;
- every difference is explained (D2).

If {% ref "WORK-633" /%} has landed, the definition is loaded through a fixture plugin's
`runeDir` rather than as a string.

## Acceptance Criteria

- [x] `lore` is defined as a composed rune with its `Article` schema row and its `registers.entity` declaration
- [x] Its JSON-LD is compared against the `lore` fixture's recorded output in `contracts/seo-baseline/baseline.json`, and every difference is explained (SPEC-147 D2)
- [x] It registers the same entity, id and data as the plugin's `lore`, asserted against the storytelling registry snapshot
- [x] The rendered tree is compared with the plugin's and every difference is recorded in the resolution
- [x] `plugins/storytelling/` is unchanged and still passing its own tests (SPEC-147 D1)

## Resolution

Completed: 2026-10-08

Branch: `claude/v041-composed-lore`
PR: refrakt-md/refrakt#690

### What was done
- `packages/content/test/fixtures/composed-storytelling/runes/lore.md`: the composed `lore`, beside `bond` and `character`.
  - It places no primitive. The template is `# {% $attrs.title %}`, then `{% metablock name="metadata" /%}` (the `category` bar), then `{% slot name="body" /%}`.
  - Schema row: `Article { title: headline, category: articleSection }`.
  - Registration: `registers.entity { idFrom: title, data: [category, spoiler, tags, { name: title }] }`.
  - `spoiler` has `default: false`, so an unset spoiler registers `"false"`, as the plugin's does.
- Fixtures: `lore.{canonical,defaults}.md`.
- `packages/content/test/composed-lore.test.ts` (20 tests). The JSON-LD is measured with the SEO baseline generator's own `harvest()`.
- `packages/content/test/composed-storytelling.ts`: `capture()` takes an optional site dir.
- SPEC-147 Finding 4: a measured note. The cross-link loss comes from the placed primitive, not from composition.
- Not registered in `@refrakt-md/storytelling` (SPEC-147 D1); `plugins/storytelling/` has no diff.
- WORK-633 had not merged, so the definition is loaded as a string. WORK-631 had not merged, so it keeps a catch-all `body`. For `lore` that is the whole content model (the plugin's `bodyOnly()`).

### Against the baseline and the plugin
- JSON-LD: the `lore` fixture publishes the recorded graph exactly, both `jsonLd` and `rendered.jsonLd`.
- RDFa: the one difference is that `headline` is on a `<meta>`, not the title `<span>`. The title is template text, so its value travels in the field bag.
- Registry: the snapshot is reproduced exactly, including `links`. The `Witch` cross-link in the lore page is kept, because the body is in the rune's own nodes. With every optional attribute unset, the data bag matches too.

### Rendered-tree differences (SPEC-147 D2), each asserted
**Same:**
- `<article>`, `data-rune`, `typeof`, `data-density`, `data-category`;
- the metadata bar apart from its class;
- no bar when there is no category.

**Different:**
1. No `rf-lore*` class (D2/D2a). The bar has no class, because no primitive's BEM pass reaches it.
2. No `data-spoiler` or `data-tags`: neither attribute is an enum or read by a metaField. Lumina's `.rf-lore--spoiler` is already dead, because the engine emits `rf-lore--true`.
3. No `data-elevation="flat"` (the plugin's `defaultElevation`) and no `data-field="content-section"`.
4. The title is an `<h1 id>`, not a `<span data-name="title" data-section="title">`.
5. The body is top-level `data-slot="body"` nodes, not a `body` div with `data-section` and `data-reading="prose"`. The plugin's `defaultReading` has no counterpart.
6. `prominence` is not accepted: a composition declares no `sections`, so it has no header role. `reading` and `dropcap` stay, through `provides: [prose]`.

### Findings
- A template heading joins `page.headings`, and the plugin's `<span>` did not. The same holds for #686's `character`, which #686 did not record. This is a document-outline effect a theme cannot undo, and it is open for the swap decision.

### Notes
- No changeset: no package change ships.
- Contracts (both copies) and the SEO baseline are unchanged. `npm test`: 5552 passed.

{% /work %}
