{% work id="WORK-622" status="in-progress" priority="high" complexity="complex" source="SPEC-145" milestone="v0.40.0" tags="runes,composition,markdoc,architecture" %}

# A rune can be defined by a composition template

The mechanism at the centre of {% ref "SPEC-145" /%}. A definition is frontmatter (the
input declaration: tag, attributes, content model, `schema`, `registers`) plus a Markdoc
body (the output template). Slot names are the join between them.

This item builds the definition → `PluginRune` path and the template's render. It
covers only the vocabulary the two slices need:

- `{% slot %}`, its fallback-content form and `each` with `$each` (D26)
- `$attrs`
- Markdoc's own `{% if %}`

The render:

- runs at the rune's transform, after field resolution, at the call site SPEC-143
  substitutes at (D4);
- feeds placed runes through their normal transforms;
- sets `data-owner` and `data-slot` on placed nodes (D10a, via {% ref "WORK-621" /%});
- leaves no element for a slot (D10c).

The composed root carries the rune's own `data-rune` and a generated block-less config
(D2a, via {% ref "WORK-620" /%}). A `registers` value that comes from a node is copied
into the field bag before the marker is stripped (D10b).

A first-party definition reaches the pipeline as a `PluginRune` carrying a template and
no `transform` ({% ref "SPEC-153" /%} D11). Loading definitions from a rune directory
(`Plugin.runeDir`, `runes.dir`) is SPEC-153's later steps and is **not** here. In this
milestone a definition is passed in as a string. The rejections are
{% ref "WORK-623" /%}'s.

## Blocked by

- {% ref "WORK-620" /%}
- {% ref "WORK-621" /%}

## Acceptance Criteria

- [ ] A rune can be defined by a Markdoc template that places named slots into other runes
- [ ] Authored content reaches a named slot as a node list, not a string
- [ ] The template renders at the rune's transform, after field resolution, at the call site {% ref "SPEC-143" /%} substitutes at — not at preprocess (D4)
- [ ] Runes placed by a template are transformed normally, verified by composing from a behaviour-driven primitive and confirming its markup and behavior binding are unchanged (D4)
- [ ] `emitAttributes`' existing `$heading`, `$field` and `'$a|$b'` forms all work from a composition template, asserted per form (D4a)
- [ ] `{% slot name="x" %}…{% /slot %}` renders its fallback content when `x` is empty
- [ ] `sections` is placed with an ordinary `{% slot name="sections" each %}`; no special form exists (D26)
- [ ] The emitted tree carries the composed rune's `data-rune`; the primitives' markers remain but do not claim the rune's identity (D3)
- [ ] A composed rune has a generated, block-less `RuneConfig`: its root carries no `rf-*` class and no `data-rune-fields`, and its modifiers, universal attributes and meta blocks render (D2a)
- [ ] Slot substitution sets the ownership marker {% ref "SPEC-146" /%} defines, on both slot-placed and template-placed nodes (D10)
- [ ] A slot emits no element; every top-level node it places carries `data-slot` in the rendered HTML, `data-owner` does not, and the composed rune's contract lists its slot names (D10c)
- [ ] A composed rune whose `registers` source is a placed node registers the same id and data as one whose source is an attribute, read from the field bag in Phase 2; `findRef` and the strip timing are unchanged (D10b)
- [ ] An author's nested rune inside a slot is never retyped as part of the composed entity (D10)
- [ ] A composed rune nested inside another cannot reach the inner one's names, and vice versa (D10)
- [ ] `extractTitle`, breadcrumb resolution and the cross-page registry read the composed rune, not its primitives
- [ ] A plugin rune entry carrying a template and no `transform` passes `validatePlugin`, and one carrying both is rejected naming the rune ({% ref "SPEC-153" /%} D11)
- [ ] `refrakt contracts` derives a composed rune's structure by expansion (D6)

{% /work %}
