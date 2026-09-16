---
rune: datatable
title: Sortable product table
role: canonical
notes: >
  Group A, resolved — no longer emits Dataset. The rune has no headline
  slot to supply a `name` and no `distribution` to point at; its five
  properties are all interaction config (WORK-567).
---
{% datatable sortable="Name,Price" searchable=true %}
| Name | Price | Category | Stock |
|------|-------|----------|-------|
| Widget A | $9.99 | Tools | 150 |
| Gadget X | $24.99 | Electronics | 42 |
{% /datatable %}
