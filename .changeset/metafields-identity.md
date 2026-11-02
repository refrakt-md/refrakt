---
'@refrakt-md/transform': minor
---

All of `metaFields` is identity (ADR-043 decision 2). A theme that overrides any part of a rune's meta fields (`metaType`, `label`, `sentimentMap` or `transform`) has the override reported and dropped, as it already was for `metaType` alone. A label is copy, a sentiment map says what a value means, and a transform says how it is formatted: all are claims about the content, not its look. No first-party theme overrides them.

**For third-party themes:** move a label, sentiment or format change into the rune's definition (or the plugin), or style the field through `[data-field="…"]`, `[data-meta-type="…"]` and `[data-meta-sentiment="…"]`. `blocks`, which fields are grouped and how they are arranged, stays the theme's.
