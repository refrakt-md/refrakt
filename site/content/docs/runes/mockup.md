---
title: Mockup
description: Wrap content in realistic device frames for phones, tablets, browsers, and laptops
---

# Mockup

Wrap any content in a realistic device frame. Choose from phones, tablets, browsers, and laptops to show how content looks in context.

## Basic usage

The default device is a browser window.

{% preview source=true %}
{% mockup %}

# Welcome to our app

Get started with a quick demo.

{% /mockup %}
{% /preview %}

## Phone devices

Use `device` to select a specific phone model.

{% preview source=true %}
{% mockup device="iphone-15" %}

# Messages

Your inbox is empty.

{% /mockup %}
{% /preview %}

Other phone options: `iphone-se`, `pixel`, `phone` (generic).

## Tablet

{% preview source=true %}
{% mockup device="ipad" %}

# Dashboard

Welcome back. Here are your latest stats.

{% /mockup %}
{% /preview %}

Also available: `tablet` (generic).

## Browser with URL

Show a URL in the address bar with the `url` attribute.

{% preview source=true %}
{% mockup device="browser" url="https://example.com/dashboard" %}

# Dashboard

Your analytics at a glance.

{% /mockup %}
{% /preview %}

## Dark browser

A dark-themed browser chrome variant.

{% preview source=true %}
{% mockup device="browser-dark" url="https://app.example.com" %}

# Dark Mode App

Content inside a dark browser frame.

{% /mockup %}
{% /preview %}

## MacBook

Full laptop frame with keyboard and trackpad.

{% preview source=true %}
{% mockup device="macbook" %}

# Desktop Application

A full-width desktop experience.

{% /mockup %}
{% /preview %}

## Watch

Compact smartwatch frame.

{% preview source=true %}
{% mockup device="watch" color="dark" %}

**10:09**

3 notifications

{% /mockup %}
{% /preview %}

## Color variants

Control the bezel color with `color`.

{% preview source=true %}
{% mockup device="iphone-15" color="light" %}

# Light Phone

Light bezel variant.

{% /mockup %}
{% /preview %}

## Label

Add a caption below the device frame.

{% preview source=true %}
{% mockup device="browser" url="https://example.com" label="Homepage — Desktop" %}

# Our Homepage

Welcome to our site.

{% /mockup %}
{% /preview %}

## Scale

Shrink or enlarge the device frame with CSS scaling.

{% preview source=true %}
{% mockup device="iphone-15" scale=0.75 %}

# Scaled Down

A 75% scale phone frame.

{% /mockup %}
{% /preview %}

## No frame

Use `device="none"` for a minimal dashed border with no chrome.

{% preview source=true %}
{% mockup device="none" %}

Content without any device chrome.

{% /mockup %}
{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `device` | `string` | `"browser"` | Device type: `iphone-15`, `iphone-se`, `pixel`, `phone`, `ipad`, `tablet`, `browser`, `browser-dark`, `macbook`, `watch`, `none` |
| `label` | `string` | — | Caption displayed below the device frame |
| `color` | `string` | `"dark"` | Bezel color: `dark`, `light`, `auto` |
| `statusBar` | `boolean` | `true` | Show status bar on mobile devices |
| `url` | `string` | — | URL to display in browser address bar |
| `scale` | `number` | `1` | CSS transform scale factor |
