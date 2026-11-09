---
title: Mockup
description: Wrap content in realistic device frames for phones, tablets, browsers, and laptops
category: Design
plugin: design
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:mockup"} /%}

Wrap any content in a realistic device frame. Choose from phones, tablets, browsers, and laptops to show how content looks in context.

## Basic usage

The default device is a browser window.

{% preview source=true %}
	{% mockup %}
		{% sandbox src="mockup-browser-landing" height=798 /%}
	{% /mockup %}
{% /preview %}

## Phone devices

Use `device` to select a specific phone model.

{% preview source=true %}
	{% mockup device="iphone-15" %}
		{% sandbox src="mockup-phone-messages" height=852 /%}
	{% /mockup %}
{% /preview %}

Other phone options: `iphone-se`, `pixel`, `phone` (generic).

## Tablet

{% preview source=true %}
	{% mockup device="ipad" %}
		{% sandbox src="mockup-tablet-dashboard" height=1180 /%}
	{% /mockup %}
{% /preview %}

Also available: `tablet` (generic).

## Browser with URL

Show a URL in the address bar with the `url` attribute.

{% preview source=true %}
	{% mockup device="browser" url="https://example.com/dashboard" %}
		{% sandbox src="mockup-browser-analytics" height=798 /%}
	{% /mockup %}
{% /preview %}

## Dark browser

A dark-themed browser chrome variant.

{% preview source=true %}
	{% mockup device="browser-dark" url="https://app.example.com" %}
		{% sandbox src="mockup-browser-deployments" height=798 /%}
	{% /mockup %}
{% /preview %}

## MacBook

Full laptop frame with keyboard and trackpad.

{% preview source=true %}
	{% mockup device="macbook" %}
		{% sandbox src="mockup-laptop-editor" height=900 /%}
	{% /mockup %}
{% /preview %}

## Watch

Compact smartwatch frame.

{% preview source=true %}
	{% mockup device="watch" color="dark" %}
		{% sandbox src="mockup-watch-face" height=242 /%}
	{% /mockup %}
{% /preview %}

## Color variants

Control the bezel color with `color`.

{% preview source=true %}
	{% mockup device="iphone-15" color="light" %}
		{% sandbox src="mockup-phone-player" height=852 /%}
	{% /mockup %}
{% /preview %}

## Label

Add a caption below the device frame.

{% preview source=true %}
	{% mockup device="browser" url="https://example.com" label="Homepage — Desktop" %}
		{% sandbox src="mockup-browser-homepage" height=798 /%}
	{% /mockup %}
{% /preview %}

## Scale

Shrink or enlarge the device frame with CSS scaling.

{% preview source=true %}
	{% mockup device="iphone-15" scale=0.75 %}
		{% sandbox src="mockup-phone-profile" height=852 /%}
	{% /mockup %}
{% /preview %}

## No frame

Use `device="none"` for a minimal dashed border with no chrome.

{% preview source=true %}
	{% mockup device="none" %}

	Content without any device chrome.

	{% /mockup %}
{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:mockup"} /%}
