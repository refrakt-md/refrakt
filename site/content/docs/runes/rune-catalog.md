---
title: Rune Catalog
description: Browse all available runes — core built-ins and official packages
---

# Rune Catalog

Runes are Markdoc tags that reinterpret standard Markdown. A heading inside `{% nav %}` becomes a group title; a list inside `{% recipe %}` becomes ingredients. Same primitives, different meaning based on context.

Runes are split into two categories: **core runes** that ship built-in with `@refrakt-md/runes`, and **official packages** that you install separately.

## Core Runes

These runes are available out of the box — no extra installation needed. They cover universal content primitives, layout, code/data display, and site structure.

### Content

| Rune | Description |
|------|-------------|
| [hint](/docs/runes/hint) | Callouts and admonitions for supplementary information |
| [figure](/docs/runes/figure) | Enhanced images with captions, sizing, and alignment |
| [sidenote](/docs/runes/sidenote) | Margin notes and footnotes alongside main content |
| [annotate](/docs/runes/annotate) | Content with margin annotations and notes |
| [pullquote](/docs/runes/pullquote) | Editorial pull quotes with alignment and style variants |
| [textblock](/docs/runes/textblock) | Styled text blocks with drop caps, columns, and lead paragraphs |
| [mediatext](/docs/runes/mediatext) | Side-by-side image and text layouts with configurable ratios |
| [conversation](/docs/runes/conversation) | Chat and dialogue display with alternating speaker messages |
| [reveal](/docs/runes/reveal) | Progressive disclosure where content appears step by step |
| [embed](/docs/runes/embed) | Embed external content like videos, tweets, and code demos |
| [icon](/docs/runes/icon) | Inline icons from the theme's icon registry |

### Layout

| Rune | Description |
|------|-------------|
| [grid](/docs/runes/grid) | Generic grid layout for arranging content in columns |
| [tabs](/docs/runes/tabs) | Tabbed content panels with heading-based tab labels |
| [accordion](/docs/runes/accordion) | Collapsible accordion sections for FAQ-style content |
| [details](/docs/runes/details) | Collapsible disclosure blocks for supplementary content |
| [sandbox](/docs/runes/sandbox) | Isolated HTML/CSS/JS rendering in an iframe |

### Code & Data

| Rune | Description |
|------|-------------|
| [codegroup](/docs/runes/codegroup) | Tabbed code block with language tabs |
| [compare](/docs/runes/compare) | Side-by-side code comparison panels |
| [diff](/docs/runes/diff) | Side-by-side or unified diff view between two code blocks |
| [datatable](/docs/runes/datatable) | Interactive data table with sorting, filtering, and pagination |
| [chart](/docs/runes/chart) | Chart visualization from a Markdown table |
| [diagram](/docs/runes/diagram) | Mermaid diagram rendering from code blocks |
| [budget](/docs/runes/budget) | Travel and project budgets with categories, line items, and totals |
| [form](/docs/runes/form) | Accessible HTML forms from Markdown with smart field type inference |

### Site

| Rune | Description |
|------|-------------|
| [layout](/docs/runes/layout) | Structural runes for defining page layouts and named content regions |
| [nav](/docs/runes/nav) | Navigation structure for sidebar and site navigation |
| [toc](/docs/runes/toc) | Auto-generated table of contents from page headings |
| [breadcrumb](/docs/runes/breadcrumb) | Navigation breadcrumbs showing page hierarchy |

## Official Packages

Official rune packages are maintained by the refrakt team and styled by the Lumina theme. Install the packages you need and add them to your config.

### @refrakt-md/marketing

Landing page and conversion runes for marketing sites and product pages.

```bash
npm install @refrakt-md/marketing
```

```json
{ "packages": ["@refrakt-md/marketing"] }
```

| Rune | Description |
|------|-------------|
| [hero](/docs/runes/hero) | Full-width intro sections for landing pages with background support and action buttons |
| [cta](/docs/runes/cta) | Focused call-to-action blocks with headlines, descriptions, and action buttons |
| [bento](/docs/runes/bento) | Magazine-style bento grid where heading levels control cell size |
| [feature](/docs/runes/feature) | Feature showcases with name, description, and optional icons |
| [steps](/docs/runes/steps) | Step-by-step instructions with numbered indicators |
| [pricing](/docs/runes/pricing) | Pricing tables with tier comparison |
| [testimonial](/docs/runes/testimonial) | Customer testimonials and reviews |
| [comparison](/docs/runes/comparison) | Product and feature comparison matrices from Markdown |

### @refrakt-md/docs

Technical documentation runes for API references, code symbols, and changelogs.

```bash
npm install @refrakt-md/docs
```

```json
{ "packages": ["@refrakt-md/docs"] }
```

| Rune | Description |
|------|-------------|
| [api](/docs/runes/api) | API endpoint documentation with method, path, and parameters |
| [symbol](/docs/runes/symbol) | Code construct documentation for functions, classes, interfaces, enums, and type aliases |
| [changelog](/docs/runes/changelog) | Version history with release notes |

### @refrakt-md/storytelling

Worldbuilding and narrative runes for fiction, games, and creative writing.

```bash
npm install @refrakt-md/storytelling
```

```json
{ "packages": ["@refrakt-md/storytelling"] }
```

| Rune | Description |
|------|-------------|
| [character](/docs/runes/character) | Rich character profiles with sections for backstory, abilities, and more |
| [realm](/docs/runes/realm) | Location profiles for worldbuilding with geography and notable features |
| [lore](/docs/runes/lore) | In-world knowledge entries for myths, prophecies, and historical records |
| [faction](/docs/runes/faction) | Organizations and groups with ranks, holdings, and alignment |
| [plot](/docs/runes/plot) | Story arcs and quest trackers with progress markers |
| [bond](/docs/runes/bond) | Relationship connections between characters or entities |
| [storyboard](/docs/runes/storyboard) | Comic and storyboard layouts from images and captions |

### @refrakt-md/places

Event planning and location runes for travel guides and venue pages.

```bash
npm install @refrakt-md/places
```

```json
{ "packages": ["@refrakt-md/places"] }
```

| Rune | Description |
|------|-------------|
| [event](/docs/runes/event) | Event information with date, location, and agenda |
| [map](/docs/runes/map) | Interactive map visualization from Markdown lists of locations |
| [itinerary](/docs/runes/itinerary) | Day-by-day travel itineraries with timed stops and locations |

### @refrakt-md/business

Organizational runes for team directories, company profiles, and timelines.

```bash
npm install @refrakt-md/business
```

```json
{ "packages": ["@refrakt-md/business"] }
```

| Rune | Description |
|------|-------------|
| [cast](/docs/runes/cast) | People directory for team pages and speaker lineups |
| [organization](/docs/runes/organization) | Structured business or organization information |
| [timeline](/docs/runes/timeline) | Chronological events displayed as a timeline |

### @refrakt-md/learning

Educational runes for tutorials, recipes, and instructional content.

```bash
npm install @refrakt-md/learning
```

```json
{ "packages": ["@refrakt-md/learning"] }
```

| Rune | Description |
|------|-------------|
| [howto](/docs/runes/howto) | Step-by-step how-to guide with tools and instructions |
| [recipe](/docs/runes/recipe) | Structured recipe with ingredients, steps, and chef tips |

### @refrakt-md/design

Design system runes for color palettes, typography specimens, and token visualization.

```bash
npm install @refrakt-md/design
```

```json
{ "packages": ["@refrakt-md/design"] }
```

| Rune | Description |
|------|-------------|
| [swatch](/docs/runes/swatch) | Inline color chip for referencing colors in prose |
| [palette](/docs/runes/palette) | Color swatch grid with optional WCAG contrast and accessibility info |
| [typography](/docs/runes/typography) | Font specimen display with live Google Fonts loading |
| [spacing](/docs/runes/spacing) | Spacing scale, border radius, and shadow token display |
| [preview](/docs/runes/preview) | Component showcase with theme toggle, responsive viewports, and adjustable width |
| [design-context](/docs/runes/design-context) | Unified design token card composing palette, typography, and spacing runes |

### @refrakt-md/media

Audio and music runes for playlists, tracks, and audio players.

```bash
npm install @refrakt-md/media
```

```json
{ "packages": ["@refrakt-md/media"] }
```

| Rune | Description |
|------|-------------|
| [playlist](/docs/runes/playlist) | Curated playlist with track listing for albums, podcasts, and mixes |
| [track](/docs/runes/track) | Standalone track or recording with metadata |
| [audio](/docs/runes/audio) | Audio player with optional waveform and chapter markers |

### @refrakt-md/plan

Planning runes for spec-driven development with AI-native workflows.

```bash
npm install @refrakt-md/plan
```

```json
{ "packages": ["@refrakt-md/plan"] }
```

| Rune | Description |
|------|-------------|
| [spec](/docs/runes/spec) | Specification document with status tracking and versioning |
| [work](/docs/runes/work) | Work item with acceptance criteria, priority, and complexity tracking |
| [bug](/docs/runes/bug) | Bug report with structured reproduction steps and severity |
| [decision](/docs/runes/decision) | Architecture decision record with context, options, and rationale |
| [milestone](/docs/runes/milestone) | Named release target with goals and status |
