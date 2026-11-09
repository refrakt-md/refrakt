---
title: Chart
description: Chart visualization from a Markdown table
category: Data
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:chart"} /%}

Draws a chart from a Markdown table: write the data as a table and pick the kind of chart with `type`.

## Bar chart

The default chart type displays data as vertical bars.

{% preview source=true %}

	{% chart type="bar" title="Monthly Revenue" %}
	| Month | Revenue | Expenses |
	|-------|---------|----------|
	| Jan   | 4200    | 3100     |
	| Feb   | 5100    | 3400     |
	| Mar   | 4800    | 3200     |
	| Apr   | 6200    | 3800     |
	{% /chart %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A table | The chart's data; the first table is used and the rest of the body is dropped |
| The table's first column | The labels along the category axis |
| The other header cells | The series names |
| The other cells | The values |

## Line chart

Use `type="line"` for trend data.

{% preview source=true %}

	{% chart type="line" title="Monthly Active Users" %}
	| Month     | Users |
	|-----------|-------|
	| January   | 1000  |
	| February  | 1240  |
	| March     | 1580  |
	| April     | 1820  |
	| May       | 2100  |
	| June      | 1950  |
	| July      | 1880  |
	| August    | 2240  |
	| September | 2680  |
	| October   | 3120  |
	| November  | 2890  |
	| December  | 3540  |
	{% /chart %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:chart"} /%}
