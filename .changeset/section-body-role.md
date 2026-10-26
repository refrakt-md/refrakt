---
'@refrakt-md/runes': minor
---

`section` declares its body as the `body` section role (SPEC-160 D1). `reading` and `dropcap` now take effect on a section's body. Before this they were accepted and silently did nothing. The body region now carries `data-section="body"`.
