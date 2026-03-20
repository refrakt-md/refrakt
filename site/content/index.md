---
title: refrakt.md
description: A content framework built on Markdoc with 60+ semantic runes
---
{% hero align="left" spacing="tight" layout="split" collapse="lg" %}
Version 0.8.4 released [Check out what's new](/releases)

# Write Markdown. Get structure.

A content framework built on [Markdoc](https://markdoc.dev). Extend Markdown with 60+ semantic runes — tags that transform standard Markdown into structured, SEO-rich, machine-readable content.

```shell
npm create refrakt
```

- [Get Started](/docs/getting-started)

---


{% showcase width="content" shadow="hard" bleed="bottom" offset="10rem" %}
{% codegroup overflow="wrap" %}
````markdoc
{% hero align="left" spacing="loose" tint="subtle" layout="split" collapse="lg" %}
Version 0.8.4 released [Check out what's new](/releases)

# Write Markdown. Get structure.

A content framework built on [Markdoc](https://markdoc.dev). Extend Markdown with 60+ semantic runes — tags that transform standard Markdown into structured, SEO-rich, machine-readable content.

```shell
npm create refrakt
```

- [Get Started](/docs/getting-started)
{% /hero %}
````
{% /codegroup %}
{% /showcase %}
{% /hero %}

{% feature align="left" spacing="loose" %}
The framework
## Why refrakt.md?

Markdown is powerful but limited. Runes extend it with semantic structure — without inventing a new syntax or locking you into a framework.

- {% icon name="puzzle" /%} **Built on Markdoc**

  Not another Markdown dialect. refrakt.md extends Markdoc with semantic runes that add meaning to the Markdown you already write. Everything Markdoc does, you keep.

- {% icon name="sparkles" /%} **Runes, not components**

  Runes reinterpret the Markdown inside them. A heading inside `{% nav %}` becomes a group title. A list inside `{% cta %}` becomes action buttons. You write Markdown — the rune decides what it means.

- {% icon name="globe" /%} **SEO from the start**

  Every rune can emit Schema.org JSON-LD and Open Graph metadata automatically. Recipes get Recipe schema, events get Event schema, FAQs get FAQ schema — no manual wiring.

- {% icon name="brain" /%} **AI-powered authoring**

  Generate full pages with `refrakt write`. The CLI knows every rune and produces valid Markdown with proper rune structure. Supports Claude and local models via Ollama.

- {% icon name="layers" /%} **Layout inheritance**

  Define regions in `_layout.md` files that cascade down directory trees. Headers, navigation, and sidebars compose automatically — no config files needed.

- {% icon name="package" /%} **Portable content**

  Runes transform at the Markdoc level, producing a generic tag tree. Your content stays decoupled from presentation — render with SvelteKit or as static HTML, with more adapters planned.
{% /feature %}

{% feature layout="split" align="left" ratio="1 1" valign="center" collapse="md" gap="loose" spacing="flush" %}
Composable by design
## Runes that work together

The `sandbox` rune turns code fences into components. Drop two of them inside a `juxtapose` and you get an interactive light-vs-dark comparison — no custom code. Each rune handles its own job while combining into something greater than the parts.

---

{% juxtapose %}

{% sandbox framework="tailwind" %}
<div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full overflow-hidden transition-colors">
    <!-- Cover Image -->
    <div class="h-32 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500"></div>
    
    <!-- Profile Content -->
    <div class="relative px-6 pb-6">
      <!-- Avatar -->
      <div class="flex justify-center -mt-16 mb-4">
        <img 
          src="https://i.pravatar.cc/120?img=32" 
          alt="Profile" 
          class="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 shadow-lg"
        />
      </div>
      
      <!-- User Info -->
      <div class="text-center mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">Sarah Johnson</h2>
        <p class="text-gray-500 dark:text-gray-400 text-sm mb-3">@sarahjohnson</p>
        <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
          Product designer passionate about crafting delightful user experiences. 
          Coffee enthusiast ☕️
        </p>
      </div>
      
      <!-- Stats -->
      <div class="flex justify-around py-4 border-y border-gray-200 dark:border-gray-700 mb-6">
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900 dark:text-white">1.2k</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Followers</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900 dark:text-white">842</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Following</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900 dark:text-white">94</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Posts</div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button class="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/30 dark:shadow-purple-500/20">
          Follow
        </button>
        <button class="flex-1 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
          Message
        </button>
      </div>
      
      <!-- Social Links -->
      <div class="flex justify-center gap-4 mt-6">
        <a href="#" class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600 dark:hover:text-violet-400 transition-all">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
        </a>
        <a href="#" class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600 dark:hover:text-violet-400 transition-all">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/></svg>
        </a>
        <a href="#" class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600 dark:hover:text-violet-400 transition-all">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        </a>
      </div>
    </div>
  </div>
</div>
{% /sandbox %}

---

{% sandbox framework="tailwind" %}
<div class="min-h-screen bg-gray-900 flex items-center justify-center p-6">
  <div class="bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
    <!-- Cover Image -->
    <div class="h-32 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500"></div>
    
    <!-- Profile Content -->
    <div class="relative px-6 pb-6">
      <!-- Avatar -->
      <div class="flex justify-center -mt-16 mb-4">
        <img 
          src="https://i.pravatar.cc/120?img=32" 
          alt="Profile" 
          class="w-32 h-32 rounded-full border-4 border-gray-800 shadow-lg"
        />
      </div>
      
      <!-- User Info -->
      <div class="text-center mb-6">
        <h2 class="text-2xl font-bold text-white mb-1">Sarah Johnson</h2>
        <p class="text-gray-400 text-sm mb-3">@sarahjohnson</p>
        <p class="text-gray-300 leading-relaxed">
          Product designer passionate about crafting delightful user experiences. 
          Coffee enthusiast ☕️
        </p>
      </div>
      
      <!-- Stats -->
      <div class="flex justify-around py-4 border-y border-gray-700 mb-6">
        <div class="text-center">
          <div class="text-2xl font-bold text-white">1.2k</div>
          <div class="text-xs text-gray-400 uppercase tracking-wide">Followers</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-white">842</div>
          <div class="text-xs text-gray-400 uppercase tracking-wide">Following</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-white">94</div>
          <div class="text-xs text-gray-400 uppercase tracking-wide">Posts</div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button class="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20">
          Follow
        </button>
        <button class="flex-1 border-2 border-gray-600 text-gray-200 font-semibold py-3 rounded-xl hover:bg-gray-700 transition-all">
          Message
        </button>
      </div>
      
      <!-- Social Links -->
      <div class="flex justify-center gap-4 mt-6">
        <a href="#" class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 text-gray-300 hover:bg-violet-900/30 hover:text-violet-400 transition-all">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
        </a>
        <a href="#" class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 text-gray-300 hover:bg-violet-900/30 hover:text-violet-400 transition-all">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/></svg>
        </a>
        <a href="#" class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 text-gray-300 hover:bg-violet-900/30 hover:text-violet-400 transition-all">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        </a>
      </div>
    </div>
  </div>
</div>
{% /sandbox %}

{% /juxtapose %}

{% /feature %}

{% feature layout="stacked" align="left" %}
Built-in SEO
## Structured data from plain Markdown

Every rune can emit Schema.org JSON-LD automatically. Write a `recipe` in Markdown — headings, lists, paragraphs — and the framework extracts Recipe schema, ingredient lists, and step instructions without any manual wiring.

---

{% preview source=true width="content" %}
{% recipe prepTime="PT5M" servings=1 difficulty="easy" layout="split-reverse" collapse="md" %}
A cocktail classic

## The Gimlet

A crisp, citrus-forward cocktail that balances gin botanicals with the sweetness of lime cordial. Shaken, strained, and served ice-cold.

- 60ml London dry gin
- 20ml fresh lime juice
- 15ml simple syrup
- Lime wheel for garnish

1. Combine gin, lime juice, and simple syrup in a cocktail shaker with ice.
2. Shake vigorously for 15 seconds until well-chilled.
3. Strain into a chilled coupe glass and garnish with a lime wheel.

---

![A gimlet cocktail](https://assets.refrakt.md/gimlet.png)
{% /recipe %}
{% /preview %}
{% /feature %}

{% feature spacing="tight" tint-mode="auto" align="left" %}
8 packages, 60+ runes
## A rune for every domain

Core ships with essentials like `hint`, `tabs`, and `accordion`. Community packages add domain-specific runes — install only what you need.


- {% icon name="rocket" /%} **Marketing**

  `hero`, `cta`, `feature`, `pricing`, `testimonial`, `bento`, `steps`, `comparison`

- {% icon name="book-open" /%} **Docs**

  `api`, `symbol`, `changelog`

- {% icon name="palette" /%} **Design**

  `swatch`, `palette`, `typography`, `spacing`, `preview`, `mockup`

- {% icon name="lightbulb" /%} **Learning**

  `howto`, `recipe`

- {% icon name="heart" /%} **Storytelling**

  `character`, `realm`, `faction`, `lore`, `plot`, `bond`, `storyboard`

- {% icon name="briefcase" /%} **Business**

  `cast`, `organization`, `timeline`

- {% icon name="map-pin" /%} **Places**

  `event`, `map`, `itinerary`

- {% icon name="video" /%} **Media**

  `playlist`, `track`, `audio`
{% /feature %}

{% testimonial variant="quote" spacing="breathe" width="content" %}
> Once you see content through the refrakt lens, plain Markdown starts feeling like it's leaving so much on the table.

**Claude Opus** — AI, Anthropic
{% /testimonial %}

{% cta spacing="breathe" %}

## Ready to get started?

Scaffold a project in seconds and start writing content with runes.

- [Get Started](/docs/getting-started)

{% /cta %}