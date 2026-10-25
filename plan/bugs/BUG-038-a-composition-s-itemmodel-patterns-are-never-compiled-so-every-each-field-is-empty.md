{% bug id="BUG-038" status="fixed" severity="major" source="SPEC-145" tags="runes, composition, content-model, dx" milestone="v0.42.0" pr="refrakt-md/refrakt#714" %}

# A composition's `itemModel` patterns are never compiled, so every `$each` field is empty

Found while probing palette as a composition ({% ref "SPEC-165" /%}).

A composition's frontmatter accepts `itemModel`, `emitTag` and `emitAttributes` on a content
field (`FIELD_KEYS`, `packages/runes/src/lib/composition.ts`). This is the same item extraction
`cast` uses in TypeScript (`plugins/business/src/tags/cast.ts`). An `each` over the field then
binds `$each.<name>` for every emitted attribute.

But in YAML a `pattern` is a string. `parseHeadingExtract` compiles its patterns into a
`RegExp`, while `parseFields` passes `itemModel` through untouched. The resolver applies a
pattern only when it is a `RegExp` (`field.pattern instanceof RegExp`,
`packages/runes/src/lib/resolver.ts:788`), so a string pattern is skipped with no error.

## Steps to Reproduce

1. Define a composition with a list field:

   ```yaml
   content:
     type: sequence
     fields:
       rows:
         match: list
         itemModel:
           fields:
             - { name: name, match: text, pattern: "^\\s*([^:]+?)\\s*:" }
             - { name: value, match: text, pattern: remainder }
         emitTag: span
         emitAttributes: { name: $name, value: $value }
   ```

   Its template iterates the field and prints `{% $each.name %} = {% $each.value %}`.
2. Use it on `- Primary: #2563EB`.

## Expected

`Primary = #2563EB`.

## Actual

` = ` for every item. The `each` runs once per item, so the list is read, but every regex field
is empty. There is no error or warning. Patching `parseFields` to compile string patterns, as
`parseHeadingExtract` does, gives the expected output.

## Fix

- In `parseFields`, compile every `itemModel` field's `pattern` that is not `remainder`, at
  every nesting level (`ItemFieldDefinition.itemModel` nests).
- Report an invalid regex as `content-model-invalid`, naming the field, as
  `parseHeadingExtract` does.
- Add a test that a YAML `itemModel` binds `$each` fields.

## Notes

- Patterns consume the text they match, in order. In the example `value` must be `remainder`,
  because a second pattern expecting the colon finds it already gone. The composed-runes guide
  should say so when it documents `itemModel`.
- An `each` must place its item with a bare `{% slot /%}` (SPEC-145 D11), even when the
  template only reads `$each.*`. The emitted item then renders nothing. That is harmless, but
  it is noise for this use. Whether a `$each`-only slot may omit it is a question for
  SPEC-165, not part of this fix.

## Resolution

Completed: 2026-10-25

Branch: `claude/v0-42-0-planning-t31f5e`

### What was done
- `composition.ts`: `parseItemModel` validates a YAML `itemModel` and compiles every `pattern` other than `remainder` into a `RegExp`, recursively through nested `itemModel`s. An invalid regex is `content-model-invalid`, naming the field.
- Tests in `composition-models.test.ts`: `- Primary: #2563EB` binds `$each.name`/`$each.value`, nested patterns compile, and a bad pattern is reported.

### Notes
- Whether a `$each`-only slot may omit the bare `{% slot /%}` is left to SPEC-165, as the bug says.

{% /bug %}
