{% work id="WORK-102" status="ready" priority="high" complexity="complex" tags="runes, content-model" milestone="v1.0.0" %}

# Migrate complex runes from Model to createContentModelSchema

Migrate the remaining runes that have custom `processChildren` overrides with stateful parsing, text pattern matching, or DOM surgery. All will use the `custom` content model type.

## Runes

| Rune | Location | Challenge |
|------|----------|-----------|
| form | `packages/runes/src/tags/form.ts` | Multi-pass field parser with type inference from names, blockquote/list pattern detection, placeholder parsing, heading-to-fieldset conversion |
| conversation | `packages/runes/src/tags/conversation.ts` | Blockquote-to-message conversion, speaker name extraction from bold text, alternating alignment |
| tabs | `packages/runes/src/tags/tabs.ts` | Heading-to-tab conversion, image extraction from heading content, header/tab content separation |
| bento | `runes/marketing/src/tags/bento.ts` | Icon paragraph extraction via descendant tag filtering, size/span tier detection, DOM surgery separating icons from body |
| comparison | `runes/marketing/src/tags/comparison.ts` | Row type detection (check/cross/negative/text), bold label extraction, separator detection/removal, table structure mapping |

## Acceptance Criteria

- [ ] `form` rewritten using `createContentModelSchema` with `custom` content model
- [ ] `conversation` rewritten using `createContentModelSchema` with `custom` content model
- [ ] `tabs` rewritten using `createContentModelSchema` with `custom` content model
- [ ] `bento` rewritten using `createContentModelSchema` with `custom` content model
- [ ] `comparison` rewritten using `createContentModelSchema` with `custom` content model
- [ ] `refrakt inspect <rune> --type=all` output is identical before and after for each rune
- [ ] All existing tests pass — especially form, tabs, and conversation tests which cover edge cases
- [ ] No Model class import remains in any of the migrated files

## Approach

Each rune's `processChildren` logic moves into the `custom` content model's `processChildren` function. The key difference is the return type — instead of setting instance properties via `@group`, the function returns a resolved fields object that the `transform` function receives.

### Per-rune notes

- **form**: The field parser state machine (type inference, blockquote detection, placeholder parsing) moves wholesale into `processChildren`. This is the largest single migration.
- **conversation**: Speaker extraction from bold text and alternating alignment tracking move to `processChildren`. Relatively contained.
- **tabs**: Heading content walking and image node extraction move to `processChildren`. The heading-to-tab tag reconstruction needs careful handling.
- **bento**: The descendant tag filtering (`icon` paragraph detection) and body/icon separation move to `processChildren`. Size tier detection stays in `transform`.
- **comparison**: Row type detection, label extraction, and separator removal move to `processChildren`. Table structure mapping stays in `transform`.

## Dependencies

- WORK-099 (simple core runes migrated)
- WORK-101 (moderate runes migrated — validates the `custom` pattern on storyboard first)

## References

- SPEC-032 (parent spec)

{% /work %}
