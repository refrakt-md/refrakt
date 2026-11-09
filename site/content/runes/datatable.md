---
title: DataTable
description: Interactive data table with sorting, filtering, and pagination
category: Data
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:datatable"} /%}

A standard Markdown table becomes an enhanced data table.

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

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A table | The data table; the first table is used and the rest of the body is left out |
| The table's header row | The column names that `sortable` and `defaultSort` refer to |

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

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:datatable"} /%}
