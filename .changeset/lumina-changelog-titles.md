---
'@refrakt-md/lumina': patch
'@refrakt-md/skeleton': patch
---

Lumina styles a changelog release's title after its version, with a muted middle dot drawn in CSS (not announced by screen readers). Bold text in a release is a small-caps badge only when it leads a list item (`- **Added** …`); bold in a summary paragraph or a hint inside a release now stays ordinary bold instead of turning into uppercase small text.
