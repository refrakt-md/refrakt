---
'@refrakt-md/runes': minor
'@refrakt-md/transform': minor
'@refrakt-md/skeleton': minor
'@refrakt-md/lumina': minor
'@refrakt-md/business': patch
---

Composition templates gain `{% group name="…" layout="bar|ladder" %}`, an engine wrapper that arranges what it holds as a row or a list of peer items without placing a rune (SPEC-156 D2, D3). A child of a bar group written with `align="end"` pushes to the row's end. A definition may declare `sequence: numbered | connected | plain` in its frontmatter: its ladder then renders an `<ol>` stamped with `data-sequence`, and numbered items get their ordinal nodes. Only the ladder is stamped, never an ordered list an author writes inside a step (D12, D14). A definition declaring a sequence without a ladder is rejected (`sequence-without-ladder`), as is a malformed group (`group-invalid`).

Skeleton gains the unsequenced ladder rule (`[data-zone-layout="ladder"]`: list reset, column flow), and `cast`'s `list` mode now uses it instead of a rule of its own. Lumina gives a numbered ladder's items the step rhythm the native `howto`, `recipe` and `steps` use.
