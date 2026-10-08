---
'@refrakt-md/transform': minor
'@refrakt-md/cli': minor
---

A `RuneConfig` may now omit `block` (SPEC-145 D2a). A block-less config gets no `rf-*` classes, on its root or on its named children, and never `rf-undefined`. Everything else the identity transform does still applies: modifiers render as `data-*` attributes, universal attributes and metadata blocks render, and `data-rune-fields` is stripped. `refrakt contracts` describes a block-less entry by `[data-rune]` and its `data-*` modifiers, with no BEM selectors. `validateThemeConfig` and `refrakt plugin validate` accept a missing `block` and still reject an empty one. `refrakt inspect --audit` and `scaffold-css` skip block-less runes, because they ship no CSS. No shipped rune drops its block yet, so existing output is unchanged.
