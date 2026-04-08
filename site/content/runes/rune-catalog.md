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
| [hint](/runes/hint) | Callouts and admonitions for supplementary information |
| [figure](/runes/figure) | Enhanced images with captions, sizing, and alignment |
| [sidenote](/runes/sidenote) | Margin notes and footnotes alongside main content |
| [annotate](/runes/annotate) | Content with margin annotations and notes |
| [pullquote](/runes/pullquote) | Editorial pull quotes with alignment and style variants |
| [textblock](/runes/textblock) | Styled text blocks with drop caps, columns, and lead paragraphs |
| [mediatext](/runes/mediatext) | Side-by-side image and text layouts with configurable ratios |
| [conversation](/runes/conversation) | Chat and dialogue display with alternating speaker messages |
| [reveal](/runes/reveal) | Progressive disclosure where content appears step by step |
| [embed](/runes/embed) | Embed external content like videos, tweets, and code demos |
| [icon](/runes/icon) | Inline icons from the theme's icon registry |

### Layout

| Rune | Description |
|------|-------------|
| [grid](/runes/grid) | Generic grid layout for arranging content in columns |
| [tabs](/runes/tabs) | Tabbed content panels with heading-based tab labels |
| [accordion](/runes/accordion) | Collapsible accordion sections for FAQ-style content |
| [juxtapose](/runes/juxtapose) | Interactive side-by-side comparison with slider, toggle, fade, and auto modes |
| [details](/runes/details) | Collapsible disclosure blocks for supplementary content |
| [sandbox](/runes/sandbox) | Isolated HTML/CSS/JS rendering in an iframe |

### Code & Data

| Rune | Description |
|------|-------------|
| [codegroup](/runes/codegroup) | Tabbed code block with language tabs |
| [compare](/runes/compare) | Side-by-side code comparison panels |
| [diff](/runes/diff) | Side-by-side or unified diff view between two code blocks |
| [datatable](/runes/datatable) | Interactive data table with sorting, filtering, and pagination |
| [chart](/runes/chart) | Chart visualization from a Markdown table |
| [diagram](/runes/diagram) | Mermaid diagram rendering from code blocks |
| [budget](/runes/budget) | Travel and project budgets with categories, line items, and totals |
| [form](/runes/form) | Accessible HTML forms from Markdown with smart field type inference |

### Site

| Rune | Description |
|------|-------------|
| [layout](/runes/layout) | Structural runes for defining page layouts and named content regions |
| [nav](/runes/nav) | Navigation structure for sidebar and site navigation |
| [toc](/runes/toc) | Auto-generated table of contents from page headings |
| [breadcrumb](/runes/breadcrumb) | Navigation breadcrumbs showing page hierarchy |

## Official Packages

Official rune packages are maintained by the refrakt team and styled by the Lumina theme. Install the packages you need and add them to your config. Each package page includes installation instructions, a full rune reference, and documentation for any additional features like CLI commands or pipeline hooks.

### [@refrakt-md/marketing](/runes/marketing)

Landing page and conversion runes for marketing sites and product pages.

| Rune | Description |
|------|-------------|
| [hero](/runes/marketing/hero) | Full-width intro sections for landing pages with background support and action buttons |
| [cta](/runes/marketing/cta) | Focused call-to-action blocks with headlines, descriptions, and action buttons |
| [bento](/runes/marketing/bento) | Magazine-style bento grid where heading levels control cell size |
| [feature](/runes/marketing/feature) | Feature showcases with name, description, and optional icons |
| [steps](/runes/marketing/steps) | Step-by-step instructions with numbered indicators |
| [pricing](/runes/marketing/pricing) | Pricing tables with tier comparison |
| [testimonial](/runes/marketing/testimonial) | Customer testimonials and reviews |
| [comparison](/runes/marketing/comparison) | Product and feature comparison matrices from Markdown |

### [@refrakt-md/docs](/runes/docs)

Technical documentation runes for API references, code symbols, and changelogs.

| Rune | Description |
|------|-------------|
| [api](/runes/docs/api) | API endpoint documentation with method, path, and parameters |
| [symbol](/runes/docs/symbol) | Code construct documentation for functions, classes, interfaces, enums, and type aliases |
| [changelog](/runes/docs/changelog) | Version history with release notes |

### [@refrakt-md/storytelling](/runes/storytelling)

Worldbuilding and narrative runes for fiction, games, and creative writing.

| Rune | Description |
|------|-------------|
| [character](/runes/storytelling/character) | Rich character profiles with sections for backstory, abilities, and more |
| [realm](/runes/storytelling/realm) | Location profiles for worldbuilding with geography and notable features |
| [lore](/runes/storytelling/lore) | In-world knowledge entries for myths, prophecies, and historical records |
| [faction](/runes/storytelling/faction) | Organizations and groups with ranks, holdings, and alignment |
| [plot](/runes/storytelling/plot) | Story arcs and quest trackers with progress markers |
| [bond](/runes/storytelling/bond) | Relationship connections between characters or entities |
| [storyboard](/runes/storytelling/storyboard) | Comic and storyboard layouts from images and captions |

### [@refrakt-md/places](/runes/places)

Event planning and location runes for travel guides and venue pages.

| Rune | Description |
|------|-------------|
| [event](/runes/places/event) | Event information with date, location, and agenda |
| [map](/runes/places/map) | Interactive map visualization from Markdown lists of locations |
| [itinerary](/runes/places/itinerary) | Day-by-day travel itineraries with timed stops and locations |

### [@refrakt-md/business](/runes/business)

Organizational runes for team directories, company profiles, and timelines.

| Rune | Description |
|------|-------------|
| [cast](/runes/business/cast) | People directory for team pages and speaker lineups |
| [organization](/runes/business/organization) | Structured business or organization information |
| [timeline](/runes/business/timeline) | Chronological events displayed as a timeline |

### [@refrakt-md/learning](/runes/learning)

Educational runes for tutorials, recipes, and instructional content.

| Rune | Description |
|------|-------------|
| [howto](/runes/learning/howto) | Step-by-step how-to guide with tools and instructions |
| [recipe](/runes/learning/recipe) | Structured recipe with ingredients, steps, and chef tips |

### [@refrakt-md/design](/runes/design)

Design system runes for color palettes, typography specimens, and token visualization. Includes a cross-page pipeline for design token aggregation.

| Rune | Description |
|------|-------------|
| [swatch](/runes/design/swatch) | Inline color chip for referencing colors in prose |
| [palette](/runes/design/palette) | Color swatch grid with optional WCAG contrast and accessibility info |
| [typography](/runes/design/typography) | Font specimen display with live Google Fonts loading |
| [spacing](/runes/design/spacing) | Spacing scale, border radius, and shadow token display |
| [preview](/runes/design/preview) | Component showcase with theme toggle, responsive viewports, and adjustable width |
| [design-context](/runes/design/design-context) | Unified design token card composing palette, typography, and spacing runes |

### [@refrakt-md/media](/runes/media)

Audio and music runes for playlists, tracks, and audio players.

| Rune | Description |
|------|-------------|
| [playlist](/runes/media/playlist) | Curated playlist with track listing for albums, podcasts, and mixes |
| [track](/runes/media/track) | Standalone track or recording with metadata |
| [audio](/runes/media/audio) | Audio player with optional waveform and chapter markers |

### [@refrakt-md/plan](/runes/plan)

Spec-driven project planning with AI-native workflows. Includes [CLI commands](/runes/plan/cli) and a [workflow guide](/runes/plan/workflow).

| Rune | Description |
|------|-------------|
| [spec](/runes/plan/spec) | Specification document with status tracking and versioning |
| [work](/runes/plan/work) | Work item with acceptance criteria, priority, and complexity tracking |
| [bug](/runes/plan/bug) | Bug report with structured reproduction steps and severity |
| [decision](/runes/plan/decision) | Architecture decision record with context, options, and rationale |
| [milestone](/runes/plan/milestone) | Named release target with goals and status |
| [backlog](/runes/plan/backlog) | Aggregation view of work items and bugs with filtering, sorting, and grouping |
| [decision-log](/runes/plan/decision-log) | Chronological view of architecture decision records |
| [plan-progress](/runes/plan/plan-progress) | Progress summary showing status counts per entity type |
| [plan-activity](/runes/plan/plan-activity) | Recent activity feed sorted by file modification time |
