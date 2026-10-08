---
'@refrakt-md/runes': minor
'@refrakt-md/types': minor
'@refrakt-md/transform': minor
'@refrakt-md/cli': minor
'@refrakt-md/language-server': minor
---

A rune can now be defined by a composition template (SPEC-145). A definition is YAML frontmatter declaring the rune's input (`tag`, `attributes`, `content`, `schema`, `registers`, `metaFields`, `blocks`) and a Markdoc body that places the content model's fields into slots of existing runes: `{% slot name="x" /%}`, with fallback content, and `{% slot name="xs" each %}…{% /slot %}` with `$each` bound to the model's `emitAttributes`. `$attrs.<name>` and Markdoc's own `{% if %}` work in the template. The template renders at the rune's transform, after field resolution, so every placed rune runs its own transform unchanged. Slot-placed nodes carry `data-slot` in the output; a slot adds no element. The composed root carries the rune's own `data-rune` and a generated block-less config, and a node-sourced `registers` value is copied into the field bag for Phase 2.

Every bad definition fails at load or construction, naming the rune and what was rejected: a preprocessor tag in the template, a second emit path, an unplaced field, an unknown or repeated slot, `each` on a single value, an undeclared `$each` or `$attrs` field, a cycle, a peer schema type, a placed rune missing its required parent, and CSS.

`PluginRune` carries exactly one of `transform` or `template` (SPEC-153 D11); `transform` is now optional on the type. `refrakt contracts` records a composed rune's slot names and expansion. No shipped rune is composed yet, so contracts and structured data are unchanged.

New exports from `@refrakt-md/runes`: `defineComposedRune`, `composedPluginRune`, `pluginRuneSchema`, `checkComposedCatalog`, `collectCompositions`, `compileComposition`, `compositionFor`, `parseCompositionDefinition`, `composedRuneConfig`, `composedTypeName`, `checkCompositions`, `SUBORDINATE_SCHEMA_TYPES`, `validatePlugin`. `createContentModelSchema` takes a `template` option.
