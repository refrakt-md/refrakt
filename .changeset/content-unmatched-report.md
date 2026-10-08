---
'@refrakt-md/runes': minor
'@refrakt-md/content': minor
---

Validation now reports content that no content-model field matches (`content-unmatched`). A rune used to drop such a node from the page silently: a block written before the first section of a rune whose preamble does not take it, a node left after the last sequence field, or a `---` zone the rune does not read. Each one is now a warning finding in `refrakt validate`, the `refrakt.validate` MCP tool and the build summary. The finding names the rune, the dropped node and its line. A `custom` content model is never reported, and neither is a rune that reads its body as raw source. `createContentModelSchema` takes a new `rawBody: true` option to declare that, and `deferBody` implies it. Turn the check off with `validation.disableIds: ["content-unmatched"]`.
