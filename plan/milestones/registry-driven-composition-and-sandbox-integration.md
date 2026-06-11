{% milestone name="v0.21.0" status="planning" %}

# v0.21.0 — Registry-driven composition and sandbox integration

A minor release turning the entity registry into something you can **author over
and visualize** — making content queryable by frontmatter, and letting sandboxes be
fed registry data to drive arbitrary client-side renderings (3D sitemaps,
relationship graphs). The thread that runs through it: the registry's render
targets grow from HTML and SVG to *bring-your-own-renderer*.

## Headline specs

- {% ref "SPEC-092" /%} — **frontmatter-declared registry entities.** Index page
  frontmatter onto the `page` entity, let a page declare a registry `type`, and add
  a config url-pattern→type rule. Open-world: documented runes/products/etc. join
  the registry by self-declaring. Showcase: a generated rune catalogue + index
  stats. (Decision: {% ref "ADR-016" /%}.)
- {% ref "SPEC-093" /%} — **data-bound sandbox.** Bind a registry query to a
  sandbox; resolve it at build and inject the JSON into the iframe so author code
  renders it — the third render target after `collection` (HTML) and `aggregate`
  (SVG). Mandatory progressive-enhancement fallback. Showcase: a 3D sitemap from the
  `pageTree`, a relationship graph from SPEC-072 edges. (Decision: {% ref "ADR-017" /%}.)

These pair deliberately: SPEC-092 makes the data rich enough (runes, tags,
relationships) for SPEC-093's visualizations to be worth building.

## Carried in from v0.20.1

- {% ref "WORK-381" /%} — **sandbox lazy/poster activation.** Deferred mount + poster
  for heavy sandboxes. Now a first-class dependency of the data-bound visualizations
  (heavy WebGL on a content page must lazy-load) as well as the index anchor.
- {% ref "WORK-350" /%} — **index bento showcase.** The capstone landing-page grid;
  fits here because its live cells are exactly this milestone's material — the plan
  `aggregate` (registry), the three.js anchor (sandbox), and — once SPEC-092/093
  land — a "runes by plugin" stat and a registry-fed visualization. Held in v0.20.1
  pending its content; this milestone gives it that content.

## Decisions

- {% ref "ADR-016" /%} — frontmatter-declared registry entities (open-world rationale).
- {% ref "ADR-017" /%} — data-bound sandboxes (third render target; mandatory fallback).

## Notes

- Implementation work items for SPEC-092 and SPEC-093 are to be scoped when the
  milestone opens (e.g. SPEC-092 Layer 1 — frontmatter indexing — is a small first
  strike that proves the loop with a live `aggregate` over rune pages).

{% /milestone %}
