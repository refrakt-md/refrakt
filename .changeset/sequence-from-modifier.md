---
'@refrakt-md/transform': minor
'@refrakt-md/storytelling': patch
'@refrakt-md/cli': patch
---

`RuneConfig.sequence` can now be read from a modifier: `{ fromModifier, valueMap?, default? }`, the form `sequenceDirection` already has. `valueMap` translates a modifier value into a sequence style, and `default` applies when the value is unset or unmapped. The literal form is unchanged.

`plot` uses it (`sequence: { fromModifier: 'structure', valueMap: { linear: 'connected' } }`) in place of its `postTransform`. Its rendered HTML is unchanged for every `structure`. `refrakt inspect --audit-dimensions` counts a modifier-sourced rune under each style its map or default can produce.
