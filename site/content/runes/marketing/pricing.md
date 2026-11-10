---
title: Pricing
description: Pricing tables with tier comparison
category: Marketing
plugin: marketing
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:pricing"} /%}

Pricing plans side by side, each with its price, what it includes and a link to sign up, published as structured offers.

## Heading-based

Write a heading for each plan, with its name and price.

{% preview source=true %}

	{% pricing %}
	# Plans

	Pick the plan that fits your needs.

	## Free — $0
	- 1 project
	- Community support
	- Basic analytics

	[Get started](/docs/getting-started)

	## Pro — $19/mo
	- Unlimited projects
	- Priority support
	- Advanced analytics

	[Start trial](/docs/getting-started)
	{% /pricing %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A heading `Name — Price` (any dash) | A tier: the plan's name, then its price |
| The content under it, up to the next tier heading | The tier's body, such as its feature list and a sign-up link |
| A short paragraph, then a heading and a paragraph, before the first tier | The eyebrow, headline and blurb ([Page sections](/docs/concepts/page-sections)) |

## Explicit tiers

Use `{% tier %}` tags when you need full control over attributes like `featured` or `currency`.

{% preview source=true %}

	{% pricing %}
		# Choose your plan

		{% tier name="Free" price="$0" %}
		- 1 project
		- Community support
		{% /tier %}

		{% tier name="Pro" price="$19" featured=true %}
		- Unlimited projects
		- Priority support
		- Advanced analytics

		[Start trial](/docs/getting-started)
		{% /tier %}

		{% tier name="Enterprise" price="Custom" %}
		- Custom integrations
		- Dedicated support
		- SLA guarantee

		[Contact us](/docs/getting-started)
		{% /tier %}
	{% /pricing %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:pricing"} /%}
