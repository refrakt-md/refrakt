{% milestone name="v0.21.0" status="active" %}

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
- {% ref "SPEC-101" /%} — **hero cover layout + animated sandbox backgrounds.**
  Make `hero` a first-class `media-position="cover"` host and let a sandbox guest
  fill the cover well — a live three.js scene as a full-bleed, inert (SPEC-090)
  animated hero backdrop. Showcase: **wireframe waves** — a displaced wireframe
  terrain in niwaki tints.

These pair deliberately: SPEC-092 makes the data rich enough (runes, tags,
relationships) for SPEC-093's visualizations to be worth building. SPEC-101 extends
the same thread from *sandbox as a render target* to *sandbox as a layout surface* —
the milestone's three.js material (WORK-381's activation, WORK-382's scene patterns,
the SPEC-093 showcases) graduates into hero composition.

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

## Work breakdown

**SPEC-092 — frontmatter entities** (each layer independently shippable):

- {% ref "WORK-383" /%} — frontmatter indexing on the `page` entity (Layer 1, the first strike).
- {% ref "WORK-384" /%} — typed page entities (`type`/`id` + a `routeRules` `entity` field).
- {% ref "WORK-385" /%} — rune-page metadata backfill (script; fixed `status` vocabulary).
- {% ref "WORK-386" /%} — the **generated rune catalogue** + index stats (the SPEC-092 showcase).
- {% ref "WORK-387" /%} — rune-doc drift guardrail (fast-follow).

**SPEC-093 — data-bound sandbox** (independent track; `flat`/`tree` need no SPEC-092):

- {% ref "WORK-388" /%} — the data-bound sandbox **core** (binding → resolve → `RF_DATA` inject → authored fallback; `flat`/`tree`).
- {% ref "WORK-389" /%} — the **3D sitemap** showcase (the launch demo; tree from `pageTree`).
- {% ref "WORK-390" /%} — the **plan relationship-graph** showcase (graph shape over SPEC-072 edges, already populated).

**SPEC-101 — hero cover + animated backgrounds:**

- {% ref "WORK-398" /%} — hero as a cover host (variant, height authority, padding, legibility).
- {% ref "WORK-399" /%} — cover guest fill + sandbox `height="fill"` (benefits card/bento covers too).
- {% ref "WORK-400" /%} — build warning: non-eager sandbox under cover (fast-follow).
- {% ref "WORK-401" /%} — the **waves scene** (niwaki-tinted wireframe backdrop; independently buildable).
- {% ref "WORK-402" /%} — docs: hero cover reference + the animated background showcase (capstone; depends on 398/399/401).

**Sequencing:** {% ref "WORK-381" /%} (lazy/poster) lands early — both showcases are heavy WebGL and lazy-mount. The two spec tracks run in parallel; the SPEC-093 showcases depend only on `pageTree` / plan edges that exist today, not on the SPEC-092 entity work. {% ref "WORK-350" /%} (index bento) consumes the registry aggregates + a data-bound viz once they exist. The SPEC-101 track is parallel too: {% ref "WORK-398" /%}/{% ref "WORK-399" /%}/{% ref "WORK-401" /%} are mutually independent, converging only in {% ref "WORK-402" /%}.

## Deferred (needs its own discussion)

- **Sentiment-coloured nav badges from `status`.** {% ref "WORK-385" /%} lands a
  fixed `status` vocabulary (`stable | beta | experimental | deprecated`) on rune
  pages *specifically so* the nav could later show a beta/experimental badge. That
  badge is a new nav feature with its own design questions (which surfaces, colour
  semantics, a11y) — out of scope here; the data is built forward-compatibly.

{% /milestone %}
