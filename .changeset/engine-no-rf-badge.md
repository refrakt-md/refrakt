---
'@refrakt-md/transform': minor
'@refrakt-md/skeleton': minor
'@refrakt-md/lumina': minor
---

The engine no longer adds `rf-badge` to field values (ADR-043 decision 3). A value states what it is (`data-meta-type`, and `data-meta-sentiment` when its field maps one), and the base stylesheet draws `status`, `category` and `tag` values as pills by that attribute. Every value is now one element: a definition-list `<dd>` holds a `<span data-meta-type>` for every kind, where a bare value used to put the type on the `<dd>` itself. `{% badge %}` keeps its `rf-badge` class, and the pill rule covers it. Lumina renders every page unchanged.

**For theme authors:** a rule on `.rf-badge` now reaches only `{% badge %}`. Style field pills with `[data-meta-type="status" | "category" | "tag"]`, and a definition-list value with `dd > [data-meta-type]` rather than `dd[data-meta-type]`.
