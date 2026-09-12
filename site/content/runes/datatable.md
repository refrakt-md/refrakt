---
title: DataTable
description: Interactive data table with sorting, filtering, and pagination
category: "Code & Data"
plugin: core
status: stable
type: rune
---

# DataTable

Interactive Markdown table with sorting, filtering, and pagination. A standard Markdown table becomes an enhanced data table.

## Basic usage

Enable sorting and search on a Markdown table.

{% preview source=true %}

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

{% preview source=true %}

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

{% include file="rune-attributes.md" variables={r: "rune:datatable"} /%}

