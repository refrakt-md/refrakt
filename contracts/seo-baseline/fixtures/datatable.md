---
rune: datatable
title: Sortable product table
role: canonical
notes: Group A — emits Dataset with no name, description or distribution.
---
{% datatable sortable="Name,Price" searchable=true %}
| Name | Price | Category | Stock |
|------|-------|----------|-------|
| Widget A | $9.99 | Tools | 150 |
| Gadget X | $24.99 | Electronics | 42 |
{% /datatable %}
