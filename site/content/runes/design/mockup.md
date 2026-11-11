---
title: Mockup
description: Wrap content in realistic device frames for phones, tablets, browsers, and laptops
category: Design
plugin: design
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:mockup"} /%}

Wraps a screenshot, a sandbox or any other content in a device frame — a phone, tablet, browser window, laptop or watch — to show how it looks in context. For a plain image with a caption, use [figure](/runes/figure).

## Basic usage

The default device is a browser window.

{% preview source=true %}
	{% mockup %}
		{% sandbox src="mockup-browser-landing" height=798 /%}
	{% /mockup %}
{% /preview %}

## Show it on a phone

`device` picks the frame.

{% preview source=true %}
	{% mockup device="iphone-15" %}
		{% sandbox src="mockup-phone-messages" height=852 /%}
	{% /mockup %}
{% /preview %}

The other phones are `iphone-se`, `pixel` and a generic `phone`. Phones show a status bar; `statusBar=false` hides it.

## Show it on a tablet

{% preview source=true %}
	{% mockup device="ipad" %}
		{% sandbox src="mockup-tablet-dashboard" height=1180 /%}
	{% /mockup %}
{% /preview %}

`tablet` is a generic alternative.

## Show a URL in the address bar

`url` fills the browser frame's address bar.

{% preview source=true %}
	{% mockup device="browser" url="https://example.com/dashboard" %}
		{% sandbox src="mockup-browser-analytics" height=798 /%}
	{% /mockup %}
{% /preview %}

## Use dark browser chrome


{% preview source=true %}
	{% mockup device="browser-dark" url="https://app.example.com" %}
		{% sandbox src="mockup-browser-deployments" height=798 /%}
	{% /mockup %}
{% /preview %}

## Show it on a laptop

`device="macbook"` draws the screen above a keyboard and trackpad.

{% preview source=true %}
	{% mockup device="macbook" %}
		{% sandbox src="mockup-laptop-editor" height=900 /%}
	{% /mockup %}
{% /preview %}

## Show it on a watch


{% preview source=true %}
	{% mockup device="watch" color="dark" %}
		{% sandbox src="mockup-watch-face" height=242 /%}
	{% /mockup %}
{% /preview %}

## Change the bezel color

`color` takes `dark` (the default), `light`, or `auto` to follow the page.

{% preview source=true %}
	{% mockup device="iphone-15" color="light" %}
		{% sandbox src="mockup-phone-player" height=852 /%}
	{% /mockup %}
{% /preview %}

## Add a caption

`label` puts a caption below the frame.

{% preview source=true %}
	{% mockup device="browser" url="https://example.com" label="Homepage — Desktop" %}
		{% sandbox src="mockup-browser-homepage" height=798 /%}
	{% /mockup %}
{% /preview %}

## Resize the frame

`scale` shrinks or enlarges the whole frame; `0.75` is three-quarters size.

{% preview source=true %}
	{% mockup device="iphone-15" scale=0.75 %}
		{% sandbox src="mockup-phone-profile" height=852 /%}
	{% /mockup %}
{% /preview %}

## Drop the device chrome

`device="none"` draws a plain dashed border instead of a device.

{% preview source=true %}
	{% mockup device="none" %}

	Content without any device chrome.

	{% /mockup %}
{% /preview %}

## Put a mockup in a card or bento

A mockup works as the media of a [card](/runes/card) or a [bento](/runes/marketing/bento) cell, and scales its frame and content to fit. [Media guests](/docs/concepts/media-guests#mockup) shows it in both.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:mockup"} /%}
