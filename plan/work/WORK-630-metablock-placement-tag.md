{% work id="WORK-630" status="ready" priority="high" complexity="moderate" source="SPEC-145" milestone="v0.40.0" tags="runes,composition,engine,blocks" %}

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

- [ ] A composed rune can place a declared `blocks` entry from its template, and the rendered result is identical to what the engine's `layout` projection produces for a tree-owning rune with the same block (D7)
- [ ] The placement tag reuses the engine's existing `renderBlock` closure; no second block-rendering path exists (D7)
- [ ] The tag is resolved in the declaring rune's config and `modifierValues`, from anywhere in its own template's subtree — not only its direct children (D7)
- [ ] A block whose fields all resolve empty removes the marker and emits nothing; a tag naming an undefined block is rejected at schema construction, naming the block (D7)
- [ ] Placing the same block twice is rejected rather than collapsed by `mapDataNames` (D7)
- [ ] The tag is not named `meta`, and the chosen name collides with neither `RuneConfig.block` nor the properties-channel meta tags (D7)
- [ ] A `blocks` theme override reaches a composed rune's placed block exactly as it reaches a projected one, so the theme's authority is unchanged by which placement path is used (D7)
- [ ] `{% metablock %}` outside a composition template is rejected, naming the tag, so a tree-owning rune has one placement mechanism
- [ ] WORK-622's remaining criterion ("…its modifiers, universal attributes and meta blocks render (D2a)") is checked and WORK-622 is marked done in the same PR
- [ ] SPEC-145 D7's sub-questions record the answers above, and the vocabulary table drops "placeholder"
- [ ] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy

## Blocks

- {% ref "WORK-625" /%}

{% /work %}
