---
title: Changelog
description: Release history for refrakt.md
---

# Changelog

{% changelog %}
## v0.41.0 - October 9, 2026

**Composed runes you can ship.** v0.40.0 built composition and proved it on `bond` and `character`. Nobody outside the repo can
use it yet: a definition reaches the pipeline only as a string passed to `defineComposedRune`.
This milestone closes that gap. A plugin ships definitions from a declared directory, a project
writes its own in `runes.dir`, and the authoring guide makes it a documented feature
(SPEC-153, SPEC-145).

[All 33 changes in v0.41.0 →](/releases/v0.41.0)

## v0.40.0 - October 8, 2026

**The first composed rune.** v0.38.0 and v0.39.0 built the prerequisites: the ownership marker, declarative
registration, slot labelling and tree-order preprocess. This milestone uses them to
ship the mechanism they were for. A rune defined as a Markdoc template placing other runes
(SPEC-145), proved on two real runes from the storytelling plugin, with the
packaging groundwork composed runes will need to be delivered (SPEC-153).

[All 18 changes in v0.40.0 →](/releases/v0.40.0)

## v0.39.0 - October 7, 2026

**Declarations, part two.** v0.38.0 deleted what was provably inert and made two declarations reach the
reader and the runtime. This milestone continues on the same line, one level up:
the remaining places where a rune's behaviour is **written as code but is really
data**, plus the one place where the two schema resolvers' disagreement already
publishes wrong structured data.

[All 46 changes in v0.39.0 →](/releases/v0.39.0)

## v0.38.0 - October 7, 2026

**Rune transform consolidation.** Across 121 runes, `transform()` is 3,955 lines. A measurable share of that is
not logic — it is dead code, guards that guard nothing, and the same four
gestures retyped. Separately, the declarative content model already states more
about a rune's authoring syntax than any tool surfaces, and one field of it
silently eats authored content.

[All 29 changes in v0.38.0 →](/releases/v0.38.0)

## v0.37.0 - October 6, 2026

**Documentation drift.** Documentation makes claims about code. Code changes independently. Nothing in
this repository connects the two, at any of the three points where the
connection can break — and all three have already broken, in the open, in pages
about the very features that would have caught them.

[All 24 changes in v0.37.0 →](/releases/v0.37.0)

## v0.36.0 - September 21, 2026

**Validation reach.** v0.34.0 connected `Markdoc.validate()` to site content. The findings exist. This
milestone is about the fact that **nobody can reach them.**

[All 45 changes in v0.36.0 →](/releases/v0.36.0)

## v0.35.0 - September 17, 2026

**Declarative schema.org mapping.** Thirty runes publish structured data. Every one of them writes it by hand,
inside its transform, in a channel no tool can read and no reviewer looks at.
This milestone turns that channel into data keyed by the rune's own names — the
same shape BEM, modifiers and `editHints` already use — and builds the review
surface it has never had.

[All 66 changes in v0.35.0 →](/releases/v0.35.0)

## v0.34.0 - September 15, 2026

**Content validation.** Every rune schema declares required attributes, typed attributes and `matches`
enums. Markdoc can check all of them, and has been able to the entire time.
Nothing in the build ever asked it to. This milestone connects the validator
that exists to the content it was written for.

[All 40 changes in v0.34.0 →](/releases/v0.34.0)

## v0.33.0 - September 13, 2026

**Generated reference docs.** Reference documentation stops being hand-copied. Every page in the docs that
claims to enumerate a complete set — configuration fields, frontmatter fields,
a rune's attributes — renders from the source that already knows the answer,
guarded by a test that fails when the two diverge.

[All 87 changes in v0.33.0 →](/releases/v0.33.0)

## v0.32.0 - September 10, 2026

**Narrowed rune schemas.** The second half of SPEC-125: a rune's Markdoc schema offers only the
universal attributes that can affect it, so `refrakt reference`, editor
completion and Markdoc validation stop over-promising — **without any of them
loading theme config**.

[All 71 changes in v0.32.0 →](/releases/v0.32.0)

## v0.31.0 - September 8, 2026

**Section-role correctness and applicability as identity.** The first half of SPEC-125, governed by ADR-028:
correct the section-role data, and make attribute applicability a rune-structural
fact that a theme cannot change.

[All 38 changes in v0.31.0 →](/releases/v0.31.0)

## v0.30.1 - September 5, 2026

**Transform engine facet decomposition.** House-cleaning on the most central package in the project. `transformRune` in
`packages/transform/src/engine.ts` resolves every universal rune axis — tint,
density, width, spacing, reading, elevation, prominence, motion, background,
frame, substrate, cover — in one ~800-line function whose steps are numbered
`1, 1b, 1c … 1h, 2 … 9`. This milestone replaces that section with a **facet
registry** (SPEC-124): one module per axis, dependencies declared
rather than implied by statement order, and a driver that merges their
contributions.

[All 68 changes in v0.30.1 →](/releases/v0.30.1)

## v0.30.0 - August 27, 2026

**Plan lifecycle validation & render-stack removal.** Two threads of plan-tooling hardening that finish work the previous milestones
deliberately left open. First, teach `plan validate` to catch **lifecycle
drift** — statuses that contradict the terminal evidence around them
(SPEC-119), the symmetric counterpart to the one-directional
lifecycle checks already in place. Second, **remove the bespoke `plan build` /
`plan serve` render stack** (SPEC-120) that v0.16.0 deprecated but
kept alive — with the SPEC-071 plan-site transition shipped, a plan
site is now an ordinary refrakt site, so the parallel SSG can go.

[All 12 changes in v0.30.0 →](/releases/v0.30.0)

## v0.29.0 - July 23, 2026

**Multi-language support (i18n foundation).** Makes Refrakt's framework-generated text — labels, navigation chrome, accessibility strings,
structural headings, and client-side behavior strings — localizable, so a site built for a
non-English locale no longer shows English UI chrome around translated content. This milestone
delivers the **string-resolution foundation** of SPEC-035. Serving the same site in
multiple languages (route trees, switcher, auto-detect) remains a deliberate Non-Goal that this
foundation is explicitly constrained to allow later without breaking changes.

[All 10 changes in v0.29.0 →](/releases/v0.29.0)

## v0.28.0 - July 17, 2026

**Plan model hardening.** Tighten the plan runes' data model along three axes: status vocabulary, spec/PR traceability, and the dependency graph — then sweep the existing content to match.

[All 27 changes in v0.28.0 →](/releases/v0.28.0)

## v0.27.0

**External data & hosted content.** Two threads that together let the pipeline ingest **real data from outside the content tree** and
run **without a local filesystem**. The first feeds charts and sortable tables from actual data
files; the second consolidates the remaining ad-hoc fs seams into one injectable interface so a
hosted renderer (the GitHub-app product) can build a tenant's repo straight from the API.

[All 6 changes in v0.27.0 →](/releases/v0.27.0)

## v0.26.0 - June 30, 2026

**Editorial reading & shared layout modes.** Continues the SPEC-094 theme-platform arc by settling the two capability gaps it
deferred: the reading register for body text (the last reserved §8 candidate) and the promotion
of `carousel` from a `gallery`-coupled behavior to a canonical layout mode any rune can opt into.
Where v0.23.0 governed a rune's **container** (elevation/prominence/width), this milestone reaches
**inside** it — how the running text reads, and how homogeneous items lay out.

[All 7 changes in v0.26.0 →](/releases/v0.26.0)

## v0.25.1 - June 24, 2026

[All 3 changes in v0.25.1 →](/releases/v0.25.1)

## v0.25.0 - June 24, 2026

**Distribution & onboarding.** With the theme platform matured across v0.22.0 (type tokens), v0.23.0 (surface axes +
skeleton/skin) and v0.24.0 (live backdrops + motion), the next move is to make that platform
**distributable** and cut the largest activation cost in the toolchain: the blank page. Three
recent specs interlock to take an author from zero to a designed, purpose-built site —
starting templates, robust install from anywhere, and presets shippable independent of a theme.

[All 7 changes in v0.25.0 →](/releases/v0.25.0)

## v0.24.6 - June 23, 2026

[All 8 changes in v0.24.6 →](/releases/v0.24.6)

## v0.24.5 - June 22, 2026

[All 1 change in v0.24.5 →](/releases/v0.24.5)

## v0.24.4 - June 18, 2026

[All 6 changes in v0.24.4 →](/releases/v0.24.4)

## v0.24.3 - June 17, 2026

[All 4 changes in v0.24.3 →](/releases/v0.24.3)

## v0.24.2 - June 17, 2026

[All 1 change in v0.24.2 →](/releases/v0.24.2)

## v0.24.1 - June 17, 2026

[All 11 changes in v0.24.1 →](/releases/v0.24.1)

## v0.24.0 - June 16, 2026

**Live backdrops & scroll-reveal motion.** Two independent feature threads, split out of v0.23.0 so the theme-platform extraction stays
focused and these ship on their own cadence. Neither depends on the v0.23.0 surface/skeleton
work; each is gated only on its own foundation.

[All 13 changes in v0.24.0 →](/releases/v0.24.0)

## v0.23.0 - June 16, 2026

**Surface axes & the skeleton/skin extraction.** The second slice of the SPEC-094 theme-platform epic. Where v0.22.0 tokenized
type and built the gallery safety net, v0.23.0 attacks the **differentiation surface**: it
extracts skeleton from skin and replaces the last cross-rune rune-name lists with
engine-emitted, theme-overridable config.

[All 15 changes in v0.23.0 →](/releases/v0.23.0)

## v0.22.0 - June 15, 2026

**Theme platform foundations.** The first slice of the SPEC-094 theme-platform epic: make the theme system ready
to support themes beyond Lumina (magazine / editorial / business) — **without yet building
one**. Two independent threads — *tokenize + generate* and *gallery + visual-regression
harness* — plus the *spike* that sizes the v0.23.0 skeleton/skin extraction.

[All 5 changes in v0.22.0 →](/releases/v0.22.0)

## v0.21.0 - June 12, 2026

**Registry-driven composition and sandbox integration.** A minor release turning the entity registry into something you can **author over
and visualize** — making content queryable by frontmatter, and letting sandboxes be
fed registry data to drive arbitrary client-side renderings (3D sitemaps,
relationship graphs). The thread that runs through it: the registry's render
targets grow from HTML and SVG to *bring-your-own-renderer*.

[All 10 changes in v0.21.0 →](/releases/v0.21.0)

## v0.20.2 - June 11, 2026

**HTML scaffold client runtime.** A focused patch closing the `@refrakt-md/html` scaffold's interactivity gap: the
adapter ships the client runtime (`@refrakt-md/html/client` + `@refrakt-md/behaviors`)
but `template-html`'s build never bundles or references it, so a scaffolded static
site has inert tabs, accordion, search, and theme-toggle. This milestone makes a
scaffolded html site interactive out of the box.

[All 2 changes in v0.20.2 →](/releases/v0.20.2)

## v0.20.1 - June 11, 2026

**Surface model: docs & showcase.** A documentation-and-showcase patch on top of v0.20.0. The surface model shipped
with per-rune reference docs; this milestone makes it *land* — a cohesive
showcase of the vocabulary as a system — and consolidates the composition docs.
No new runtime features.

[All 7 changes in v0.20.1 →](/releases/v0.20.1)

## v0.20.0 - June 10, 2026

**Surface model: chrome, fills, cover layout & engine variants.** Completes the surface model — every rune surface gets a consistent chrome, fill,
and layout vocabulary — and lands the engine primitive (config variants) that the
cover layout depends on.

[All 6 changes in v0.20.0 →](/releases/v0.20.0)

## v0.19.0 - June 9, 2026

**Polish, composability & rollups.** Where v0.18.0 hardened the rune output *contract*, v0.19.0 builds on that stable
base along several threads: visual polish of the Lumina theme, making rune
*composability* a supported and validated surface (SPEC-084), turning
*bento* into a proper composition substrate (SPEC-085), and improving
the cross-page *aggregation* runes that the plan plugin leans on.

[All 53 changes in v0.19.0 →](/releases/v0.19.0)

## v0.18.0 - June 3, 2026

**Contract hardening.** Follows v0.17.0's declarative metadata-and-layout model. The release hardens
the rune output contract before third-party themes build against it, and lands
the one breaking change held back from v0.17.0.

[All 12 changes in v0.18.0 →](/releases/v0.18.0)

## v0.17.0 - June 2, 2026

**Declarative metadata & layout.** The v0.17.0 milestone follows v0.16.0's registry-driven sites with a fully
declarative model for how metadata-bearing and media-bearing runes are
assembled — replacing per-rune imperative structure code with a small,
orthogonal config vocabulary (`metaFields` + `blocks` + `layout`) and giving
every rune a consistent, theme-overridable metadata treatment. It also lands
the `file-ref` rune and the shared `preview` drawer.

[All 17 changes in v0.17.0 →](/releases/v0.17.0)

## v0.16.1 - May 31, 2026

[All 20 changes in v0.16.1 →](/releases/v0.16.1)

## v0.16.0 - May 29, 2026

**Registry-driven sites.** v0.16.0 turns the entity registry into pages and listings declaratively,
delivers the three sibling registry-query runes
(`collection` / `relationships` / `aggregate` — items / edges / numbers),
and proves the system by scaffolding a real plan site from refrakt's own
`plan/` content. Builds directly on v0.15.0's embedding primitives
(`ref` / `expand`).

[All 16 changes in v0.16.0 →](/releases/v0.16.0)

## v0.15.0 - May 25, 2026

**Composable embedding.** The v0.15.0 milestone delivers the cluster of runes and infrastructure that makes refrakt's "embed anything inline" story real: a body-only drawer rune with xref-as-trigger (SPEC-060), an `expand` rune that inlines registered entities (SPEC-066), a `snippet` rune that embeds project files as syntax-highlighted code (SPEC-062), and the supporting plumbing that ties them together: `$page.*`/`$file.*` page variables (SPEC-061), generic file roots for namespaced file resolution (SPEC-063), unconditional plan-entity registration (SPEC-064), and configurable xref resolution with patterns and decoupled entity/URL lookup (SPEC-065).

[All 56 changes in v0.15.0 →](/releases/v0.15.0)

## v0.14.4 - May 22, 2026

**Framework adapter parity with the SvelteKit reference.** The v0.14.4 milestone implements SPEC-058 — closes the parity gap the v0.14.x patch line opened between `@refrakt-md/sveltekit` (the adapter the refrakt documentation site itself ships on) and the four other framework adapters (`@refrakt-md/astro`, `@refrakt-md/nuxt`, `@refrakt-md/next`, `@refrakt-md/eleventy`) plus the framework-agnostic `@refrakt-md/html` renderer.

[All 9 changes in v0.14.4 →](/releases/v0.14.4)

## v0.14.3 - May 21, 2026

**Navigation enrichment: slug resolution and richer dropdowns.** The v0.14.3 milestone delivers two coordinated navigation specs: SPEC-055 fixes nav slug ambiguity and the multiple-items-active-at-once symptom by moving slug resolution to build time and introducing multi-segment slugs as the first-class disambiguator; SPEC-054 extends the existing nav layouts so authors can compose Linear- / Vercel- / Stripe-style header dropdowns from the primitives they already know — `layout="menubar"` accepts arbitrary block content inside `## groups` with a position-based intro / footer slot rule, `layout="columns"` gains a `---`-between-sections column-flow rule plus a headingless mode, and a new `layout="strip"` lands for compact secondary link rows. Plus a new core `{% badge %}` inline rune and a generalisation of `auto=true` description / icon enrichment to every layout.

[All 9 changes in v0.14.3 →](/releases/v0.14.3)

## v0.14.2 - May 20, 2026

**Curated syntax preset lineup (Phase 1).** The v0.14.2 milestone implements SPEC-057 — imports six widely-recognised syntax palettes (**Dracula, Solarized, Catppuccin, Tokyo Night, One Dark, Gruvbox**) as first-party refrakt presets, following the pattern established by Nord in WORK-220.

[All 4 changes in v0.14.2 →](/releases/v0.14.2)

## v0.14.1 - May 20, 2026

**Syntax token contract extension.** The v0.14.1 milestone implements SPEC-056 — widens the `SyntaxTokens` contract from 7 required + 2 optional roles to 7 required + 9 optional, with fallback chains via CSS `var()` so simple presets stay simple and richer presets gain the headroom to faithfully carry well-known palettes (Nord, Dracula, Solarized, Catppuccin, Tokyo Night, GitHub, …) without losing the role splits their authors designed in.

[All 9 changes in v0.14.1 →](/releases/v0.14.1)

## v0.14.0 - May 19, 2026

**Design tokens contract + brand identity.** The v0.14.0 milestone establishes refrakt's design tokens contract as a typed, theme-agnostic surface (SPEC-048), refreshes the brand mark with a monochrome prism logo (SPEC-050), aligns tint vocabulary with the rest of the token system (SPEC-053), ships Lumina with a neutral default palette plus two opt-in presets — `tideline` and `niwaki` — that demonstrate the preset architecture (SPEC-051), and lets authors lock or unlock tint modes per page or subtree via frontmatter cascade (SPEC-052).

[All 18 changes in v0.14.0 →](/releases/v0.14.0)

## v0.12.0 - May 11, 2026

**Plugin Unification & Hardening.**

[All 35 changes in v0.12.0 →](/releases/v0.12.0)

## v0.11.3 - May 4, 2026

[All 8 changes in v0.11.3 →](/releases/v0.11.3)

## v0.11.2 - May 3, 2026

[All 4 changes in v0.11.2 →](/releases/v0.11.2)

## v0.11.1 - May 3, 2026

[All 1 change in v0.11.1 →](/releases/v0.11.1)

## v0.11.0 - May 3, 2026

**Unified Config & MCP Server.**

[All 10 changes in v0.11.0 →](/releases/v0.11.0)

## v0.10.1 - April 29, 2026

[All 1 change in v0.10.1 →](/releases/v0.10.1)

## v0.10.0 - April 28, 2026

[All 5 changes in v0.10.0 →](/releases/v0.10.0)

## v0.9.9 - April 19, 2026

[All 7 changes in v0.9.9 →](/releases/v0.9.9)

## v0.9.8 - April 15, 2026

[All 1 change in v0.9.8 →](/releases/v0.9.8)

## v0.9.7 - April 15, 2026

[All 1 change in v0.9.7 →](/releases/v0.9.7)

## v0.9.6 - April 14, 2026

[All 27 changes in v0.9.6 →](/releases/v0.9.6)

## v0.9.5 - April 10, 2026

[All 9 changes in v0.9.5 →](/releases/v0.9.5)

## v0.9.4 - April 9, 2026

[All 12 changes in v0.9.4 →](/releases/v0.9.4)

## v0.9.3 - April 9, 2026

[All 28 changes in v0.9.3 →](/releases/v0.9.3)

## v0.9.2 - April 7, 2026

[All 1 change in v0.9.2 →](/releases/v0.9.2)

## v0.9.1 - April 3, 2026

[All 14 changes in v0.9.1 →](/releases/v0.9.1)

## v0.9.0 - March 30, 2026

**Universal Theming & Package Pipeline.**

[All 23 changes in v0.9.0 →](/releases/v0.9.0)

## v0.8.5 - March 20, 2026

[All 1 change in v0.8.5 →](/releases/v0.8.5)

## v0.8.4 - March 19, 2026

[All 1 change in v0.8.4 →](/releases/v0.8.4)

## v0.8.3 - March 19, 2026

[All 13 changes in v0.8.3 →](/releases/v0.8.3)

## v0.8.2 - March 17, 2026

[All 1 change in v0.8.2 →](/releases/v0.8.2)

## v0.8.1 - March 16, 2026

[All 1 change in v0.8.1 →](/releases/v0.8.1)

## v0.8.0 - March 10, 2026

[All 13 changes in v0.8.0 →](/releases/v0.8.0)

## v0.7.2 - March 4, 2026

[All 5 changes in v0.7.2 →](/releases/v0.7.2)

## v0.7.1 - March 3, 2026

[All 1 change in v0.7.1 →](/releases/v0.7.1)

## v0.7.0 - March 3, 2026

[All 1 change in v0.7.0 →](/releases/v0.7.0)

## v0.6.0 - March 2, 2026

[All 28 changes in v0.6.0 →](/releases/v0.6.0)

## v0.5.1

[All 1 change in v0.5.1 →](/releases/v0.5.1)

## v0.5.0 - February 23, 2026

[All 50 changes in v0.5.0 →](/releases/v0.5.0)

## v0.4.0 - February 16, 2026

[All 18 changes in v0.4.0 →](/releases/v0.4.0)

## v0.3.0 - February 13, 2026

[All 4 changes in v0.3.0 →](/releases/v0.3.0)

## v0.2.0 - February 12, 2026

[All 1 change in v0.2.0 →](/releases/v0.2.0)
{% /changelog %}
