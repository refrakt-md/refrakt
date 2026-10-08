{% work id="WORK-630" status="done" priority="high" complexity="moderate" source="SPEC-145" milestone="v0.40.0" tags="runes,composition,engine,blocks" pr="refrakt-md/refrakt#685" %}

# A composition template places a declared meta block with `{% metablock %}`

{% ref "SPEC-145" /%} D7. A composed rune has no `layout`, and the engine renders a declared
`blocks` entry only through `layout`. So a composed rune can declare `metaFields` and
`blocks` in full and get nothing, with no diagnostic.

{% ref "WORK-622" /%} landed the generated config carrying both but left its "meta blocks
render" criterion unchecked for this reason (#683). `character`'s `blocks.metadata` (role and
status as a definition list) needs it for {% ref "WORK-625" /%}. Pulled into v0.40.0 on
2026-10-08 rather than dropping the block from the composed `character`. Placing a `badge` or
`deflist` rune instead is the channel SPEC-145's authoring note rules out for attribute
values.

## D7's sub-questions, settled here

- **The name is `metablock`.**
  - `meta` is ruled out by D7: it already means HTML `<meta>` and the properties channel.
  - `block` is ruled out by D7: it collides with `RuneConfig.block`.
  - `fields` is ruled out because a composition template already uses "field" for
    content-model fields, the things slots place (D26). `{% fields name="metadata" /%}`
    would read as placing content.
  - `metablock` names the two declarations it reads, `metaFields` and `blocks`.
- **Template vocabulary only.** A tree-owning rune keeps `layout` as its one placement
  mechanism. The tag is registered for composition templates and is not an author-facing
  rune, so no rune has two placement paths.
- **Empty and undefined differ.** A block whose fields all resolve empty removes the
  marker and emits nothing. A name that matches no declared block is rejected at schema
  construction, naming the block.
- **Placing one block twice is an error**, rejected at schema construction rather than
  collapsed by `mapDataNames`.

## Acceptance Criteria

- [x] A composed rune can place a declared `blocks` entry from its template, and the rendered result is identical to what the engine's `layout` projection produces for a tree-owning rune with the same block (D7)
- [x] The placement tag reuses the engine's existing `renderBlock` closure; no second block-rendering path exists (D7)
- [x] The tag is resolved in the declaring rune's config and `modifierValues`, from anywhere in its own template's subtree — not only its direct children (D7)
- [x] A block whose fields all resolve empty removes the marker and emits nothing; a tag naming an undefined block is rejected at schema construction, naming the block (D7)
- [x] Placing the same block twice is rejected rather than collapsed by `mapDataNames` (D7)
- [x] The tag is not named `meta`, and the chosen name collides with neither `RuneConfig.block` nor the properties-channel meta tags (D7)
- [x] A `blocks` theme override reaches a composed rune's placed block exactly as it reaches a projected one, so the theme's authority is unchanged by which placement path is used (D7)
- [x] `{% metablock %}` outside a composition template is rejected, naming the tag, so a tree-owning rune has one placement mechanism
- [x] WORK-622's remaining criterion ("…its modifiers, universal attributes and meta blocks render (D2a)") is checked and WORK-622 is marked done in the same PR
- [x] SPEC-145 D7's sub-questions record the answers above, and the vocabulary table drops "placeholder"
- [x] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy

## Blocks

- {% ref "WORK-625" /%}

## Resolution

Completed: 2026-10-08

Branch: `claude/v040-metablock`
PR: refrakt-md/refrakt#685

### What was done
- `packages/runes/src/lib/composition.ts`:
  - `{% metablock name="…" /%}` is checked at construction, and each check names the block: an undeclared name (the message lists the declared ones), a block placed twice, a placement inside an `each` slot, an inline placement, content, or any attribute other than `name`.
  - At render the tag becomes a marker carrying the block name and owner, transformed under `refrakt:metablock`, a key no authored tag can name.
  - The contract outline records `{ metablock }`.
  - `composedRuneConfig` makes a modifier of every attribute a `metaFields` entry reads (the field, its `condition`, `href`, `rating.total`).
- `packages/runes/src/composed-rune.ts` passes the definition's block names to the compiler.
- `packages/transform/src/engine.ts`:
  - `renderBlock` is hoisted into `makeBlockRenderer`, which `assembleWithBlocks` and the new `placeMetablocks` both call. That is the one renderer.
  - `placeMetablocks` runs in a block-less rune's own pass, before its placed primitives. It fills the rune's markers anywhere in its subtree, stops at a nested instance of the same rune, and drops the marker when the block renders empty or a theme removed it.
  - `METABLOCK_ATTR` and `METABLOCK_OWNER_ATTR` are exported.
- `packages/runes/test/composition-metablock.test.ts` (16 tests) covers every criterion, plus WORK-622's D2a criterion.
- SPEC-145:
  - D7's sub-questions are settled: the name is `metablock`; empty and undefined are handled differently; placing a block twice is an error; the tag is template vocabulary only.
  - D7 gains "How it is built" and two measured consequences.
  - The vocabulary paragraph no longer calls the name open.
  - The `bond` worked example is corrected to #684's form, with a note on why.
- Docs: `rune-authoring/authoring-overview.md` and `theme-authoring/config-api.md`.
- Changeset: minor for `@refrakt-md/runes` and `@refrakt-md/transform`.
- Carries the parent's plan commit, which adds WORK-630 to v0.40.0 and makes WORK-625 blocked by it.

### Findings
- "Identical to `layout` projection" holds for the block as `renderBlock` emits it. A primitive's BEM pass reaches every `data-name` descendant of its named children, so a block inside `card`'s body gains `rf-card__metadata` / `rf-card__row`. A projected block gains the owner's `rf-{block}__*` instead. The test compares without classes; this is recorded in D7.
- `metaFields` resolve against modifier values only. Under a generated config that modified enum attributes only, D7's own `realm` example (`realmType`, `scale`, free text) rendered empty. Fixed by making read attributes modifiers. They now also render as `data-*` on the root, as on a tree-owning rune.
- A fixture rune named `region` collides with the core `region` rune in `assembleThemeConfig`; the tests use `territory`.

### Notes
- On a page, `{% metablock %}` is `tag-undefined`, like `{% slot %}`. It is not registered as a page tag, so no rune has two placement mechanisms.
- Contracts (both copies) and the SEO baseline are unchanged. `npm test`: 5505 passed.

{% /work %}
