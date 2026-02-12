---
title: DataTable
description: Interactive data table with sorting, filtering, and pagination
---

# DataTable

Interactive Markdown table with sorting, filtering, and pagination. A standard Markdown table becomes an enhanced data table.

```markdoc
{% datatable sortable="Name,Price" searchable=true %}
| Name | Price | Category |
|------|-------|----------|
| Widget A | $9.99 | Tools |
| Widget B | $14.99 | Tools |
{% /datatable %}
```

### Example

{% datatable sortable="Name,Price" searchable=true %}
| Name | Price | Category | Stock |
|------|-------|----------|-------|
| Widget A | $9.99 | Tools | 150 |
| Widget B | $14.99 | Tools | 85 |
| Gadget X | $24.99 | Electronics | 42 |
| Gadget Y | $19.99 | Electronics | 128 |
| Part Z | $4.99 | Components | 500 |
{% /datatable %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `sortable` | `string` | — | Comma-separated list of sortable column names |
| `searchable` | `boolean` | `false` | Enable search/filter input |
| `pageSize` | `number` | `0` | Rows per page (0 = show all) |
| `defaultSort` | `string` | — | Column to sort by default |
