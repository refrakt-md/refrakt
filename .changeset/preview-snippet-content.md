---
'@refrakt-md/runes': patch
'@refrakt-md/design': patch
---

**A snippet inside a preview renders as the preview's content.** `{% preview %}` takes its first code block as the source to show, and a `{% snippet %}` becomes a code block before the preview sees it, so a preview of a snippet showed the file with no rendered side and no sign of the tag. The snippet's code block is now marked (`snippet` on the fence), the preview renders it as content, and `source=true` shows the `{% snippet %}` tag that produced it.
