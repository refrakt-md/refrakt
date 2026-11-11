---
'@refrakt-md/runes': patch
'@refrakt-md/design': patch
---

**A snippet in a preview is the content when it is alone, and the source beside other content.** `{% preview %}` takes its first code block as the source to show, and a `{% snippet %}` becomes a code block before the preview sees it, so a preview holding only a snippet rendered nothing and never showed the tag. The snippet's code block is now marked (`snippet` on the fence): on its own it renders as the preview's content, and `source=true` shows the `{% snippet %}` tag. Beside other content, such as a sandbox, it is still that content's source, read from the file.
