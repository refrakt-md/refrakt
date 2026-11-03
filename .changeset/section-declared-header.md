---
'@refrakt-md/runes': minor
---

`section`'s header grammar is now its declared content model (SPEC-186 D5). The eyebrow, headline and blurb are an optional group, so a paragraph with no heading after it is body (ADR-046). `header="headline"` and `header="none"` are conditional models, and a split section reads its media, content and footer zones through a delimited model. The hand-written reader (`sectionHeaderParts`) is removed, and the composition audit (`slot-header-role`) reads the same declared model, so rendering, the audit and the editor cannot disagree. Rendering is unchanged.
