---
'@refrakt-md/marketing': patch
'@refrakt-md/media': patch
'@refrakt-md/skeleton': patch
'@refrakt-md/lumina': patch
---

`steps` names its item container (`data-name="steps"`, `.rf-steps__steps`), so a layout can address it and its styles no longer reach an `<ol>` an author writes inside a step. `playlist` names its `tracks` list through `refs`, with identical output.
