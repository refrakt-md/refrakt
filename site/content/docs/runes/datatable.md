---
title: DataTable
description: Interactive data table with sorting, filtering, and pagination
---

# DataTable

Interactive Markdown table with sorting, filtering, and pagination. A standard Markdown table becomes an enhanced data table.

## Basic usage

Enable sorting and search on a Markdown table.

```markdoc
{% datatable sortable="Name,Price" searchable=true %}
| Name | Price | Category | Stock |
|------|-------|----------|-------|
| Widget A | $9.99 | Tools | 150 |
| Widget B | $14.99 | Tools | 85 |
| Gadget X | $24.99 | Electronics | 42 |
| Gadget Y | $19.99 | Electronics | 128 |
| Part Z | $4.99 | Components | 500 |
{% /datatable %}
```

{% preview %}

{% datatable sortable="Name,Price" searchable=true %}
| Name | Price | Category | Stock |
|------|-------|----------|-------|
| Widget A | $9.99 | Tools | 150 |
| Widget B | $14.99 | Tools | 85 |
| Gadget X | $24.99 | Electronics | 42 |
| Gadget Y | $19.99 | Electronics | 128 |
| Part Z | $4.99 | Components | 500 |
{% /datatable %}

{% /preview %}

## With pagination

Use `pageSize` to paginate large tables.

```markdoc
{% datatable sortable="Name,Price" searchable=true pageSize=3 %}
| Name | Price | Category | Stock |
|------|-------|----------|-------|
| Widget A | $9.99 | Tools | 150 |
| Widget B | $14.99 | Tools | 85 |
| Gadget X | $24.99 | Electronics | 42 |
| Gadget Y | $19.99 | Electronics | 128 |
| Part Z | $4.99 | Components | 500 |
{% /datatable %}
```

{% preview %}

{% datatable sortable="Name,Price" searchable=true pageSize=3 %}
| Name | Price | Category | Stock |
|------|-------|----------|-------|
| Widget A | $9.99 | Tools | 150 |
| Widget B | $14.99 | Tools | 85 |
| Gadget X | $24.99 | Electronics | 42 |
| Gadget Y | $19.99 | Electronics | 128 |
| Part Z | $4.99 | Components | 500 |
{% /datatable %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `sortable` | `string` | — | Comma-separated list of sortable column names |
| `searchable` | `boolean` | `false` | Enable search/filter input |
| `pageSize` | `number` | `0` | Rows per page (0 = show all) |
| `defaultSort` | `string` | — | Column to sort by default |
