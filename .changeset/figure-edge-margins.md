---
'@refrakt-md/lumina': patch
---

**A figure's body sits flush with its edges.** A code block or table at the top or bottom of a `{% figure %}` kept its outer margin, leaving a gap above a code block that an image never had. The first child's top margin and the last body child's bottom margin are now cleared, as in a card; the caption keeps its own gap.
