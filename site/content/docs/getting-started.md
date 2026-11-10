---
title: Getting Started
description: Create a refrakt.md site and edit your first page
---

# Getting Started

refrakt.md is a content framework built on [Markdoc](https://markdoc.dev). You write Markdown, and runes — tags such as `{% hint %}` or `{% recipe %}` — give the Markdown inside them a meaning: a list in a recipe becomes its ingredients, a heading in a nav becomes a group title.

## Create a site

```shell
npx create-refrakt my-site
```

It asks which framework to build with: `sveltekit`, `astro`, `next`, `nuxt`, `eleventy` or `html`. Pass `--target` to skip the question, for example `npx create-refrakt my-site --target astro`. If you have no preference, choose SvelteKit. [Adapters](/docs/adapters/adapters-overview) compares them.

## Start it

```shell
cd my-site
npm install
npm run dev
```

Open the address the dev server prints. With the `html` target there is no dev server: run `npm run build` and then `npm run serve`.

## Edit your first page

Open `content/index.md`. It is the home page:

```markdoc
---
title: Welcome
description: A new refrakt.md site
---

{% cta %}

# Welcome to your site

This site is built with refrakt.md — a content framework that extends Markdown with semantic runes.

- [Get Started](/docs/getting-started)

{% /cta %}
```

Change the heading and save; the page reloads with your change. Inside `{% cta %}`, the heading becomes the call to action's headline and the list of links becomes its buttons.

Add a callout below it:

```markdoc
{% hint type="check" %}
Your first rune.
{% /hint %}
```

Every page is a Markdown file under `content/`; its path is its URL, so `content/about.md` is `/about`. `content/_layout.md` holds the header and navigation that wrap every page; add your page to its `{% nav %}` list to link it.

## Next

- [The rune catalogue](/runes/rune-catalog) — every rune, with live examples.
- [Content](/docs/content) — how pages, layouts and routes fit together.
- [Configuration](/docs/configuration/overview) — `refrakt.config.json`, plugins and themes.
- [Manual setup](/docs/manual-setup) — adding refrakt.md to a project you already have.

Every scaffolded site has an `AGENTS.md` at its root with the full reference for the runes it uses, for you and for AI coding tools. Regenerate it with [`refrakt reference dump`](/docs/cli/reference) after adding a plugin or upgrading a `@refrakt-md/*` package.
