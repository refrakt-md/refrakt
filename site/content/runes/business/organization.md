---
title: Organization
description: Structured business or organization information
category: Business
plugin: business
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:organization"} /%}

A profile of a business or organization: its name, description, logo and contact details, published as structured data. To list the people in it, use [cast](/runes/business/cast).

## Local business

A local business listing with address, hours, and contact info.

{% preview source=true %}

	{% organization type="LocalBusiness" %}
	# Acme Coffee Shop

	Your neighborhood coffee shop since 2015. We serve locally roasted coffee and fresh pastries every day.

	- **Address:** 123 Main St, Portland, OR 97201
	- **Hours:** Mon–Fri 7am–6pm, Sat–Sun 8am–5pm
	- **Phone:** (503) 555-0123
	- [Website](https://acme.coffee)
	{% /organization %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A heading | The organization's name |
| A paragraph after the heading | Its description |
| A short paragraph before the heading | An eyebrow above the name |
| An image before the list | The header image, such as a logo |
| A list or blockquote | The details: address, hours, phone, links |

## Corporation

A corporation profile with structured data.

{% preview source=true %}

	{% organization type="Corporation" %}
	# Acme Coffee Roasters, Inc.

	Roasting and selling specialty coffee from Portland, through three cafés and an online subscription.

	- **Founded:** 2015
	- **Headquarters:** Portland, OR
	- [Website](https://acme.coffee)
	- [GitHub](https://github.com/acme-coffee)
	{% /organization %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:organization"} /%}
