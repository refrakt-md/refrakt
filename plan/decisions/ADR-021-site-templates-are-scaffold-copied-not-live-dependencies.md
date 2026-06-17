{% decision id="ADR-021" status="accepted" date="2026-06-15" source="SPEC-109" tags="templates, scaffolding, distribution, architecture" %}

# Site templates are scaffold-copied, not live dependencies

## Context

Site templates ({% ref "SPEC-109" /%}) package a purpose-built site — a content tree plus a
config fragment and a recommended theme. A foundational question shapes the whole format: when
an author "uses" a template, does its content become **part of their project** (copied in,
owned, edited freely), or does it stay a **dependency** resolved from `node_modules` and
rendered in place?

The answer cuts across the rest of the design: how the content is delivered, whether and how it
updates, how it composes with the framework starter and theme, and what the install/scaffold
command actually does. It also needs to sit coherently beside themes, which *are* live
dependencies (ADR-009) precisely because their value is in receiving updates.

The two layers have opposite editing models. A **theme** is something an author configures and
otherwise leaves alone; shipping fixes/improvements to it via a version bump is a feature. A
**template's content** is the first thing an author rewrites — it is a starting point, not a
managed surface. That asymmetry is the crux.

## Options Considered

### 1. Template as a live dependency, content served from `node_modules`

The project depends on the template package; content is read from the installed package and
can be overridden file-by-file.

**Pros:** templates can ship fixes via version bumps; mirrors the theme model exactly; the
project tree stays small.
**Cons:** an author is *supposed* to rewrite this content, so "update the template" becomes an
unwinnable three-way merge against changed content; override-by-file for a whole site is far
heavier than for a handful of theme components; the mental model ("edit content that lives in
node_modules") is backwards. Rejected — it fights the editing model of the thing it delivers.

### 2. Template scaffold-copied; content owned, theme + plugins pinned as deps (chosen)

At scaffold time the template's content tree is **copied into the project** and becomes the
author's. Its `configFragment` is merged into the generated `refrakt.config.json`. Its
**recommended theme and required plugins are pinned as real dependencies** of the new project
(installed, live, updatable).

**Pros:** content is owned and freely editable, matching how authors actually use a starting
point; the theme/plugins stay live and updatable where update *is* valuable; yields a clean,
legible split from themes — *themes are live dependencies that benefit from updates; templates
are one-time copies*; the install command's "what happens next" is unambiguous per artifact
kind.
**Cons:** a template can't push content fixes to projects already scaffolded from it (its
ongoing value is "more templates to start from," not "this content auto-updates"); because the
copied content references evolving rune syntax, templates must be CI-built to catch drift.

### 3. Hybrid — copy content, but vendor the theme too

Copy both content and a snapshot of the theme into the project.

**Pros:** fully self-contained output.
**Cons:** discards the theme's update path (re-creating ADR-009's problem), bloats the project,
and blurs the clean theme-vs-template distinction. Rejected — needlessly couples two layers
that should stay independent.

## Decision

Adopt **Option 2**: templates are **scaffold-copied**. The content tree is copied into the new
project and owned by the author; the `configFragment` is merged into the generated config; the
recommended theme and required plugins are pinned as live dependencies. Templates are not
served from, or updated via, `node_modules`.

## Rationale

The decision follows from the editing model of what each layer delivers. Content is rewritten;
themes are configured and left alone. Delivering rewritable content as an auto-updating
dependency creates a merge problem with no good resolution, while delivering it as a copy
matches exactly how every template marketplace and starter kit already works — you get a copy
and make it yours.

Keeping the theme and plugins as live dependencies preserves the one update path that *is*
valuable (ADR-009 made themes framework-agnostic packages specifically so they could evolve
independently), and it produces a crisp, teachable distinction: **theme = live dependency,
template = one-time copy.** That distinction also disambiguates the shared install surface
({% ref "SPEC-110" /%}): source *resolution* is common, but the apply step is "add dependency"
for a theme and "copy + merge" for a template.

## Consequences

- `create-refrakt` composes three inputs — framework starter, copied template content, and a
  pinned theme dependency — merging the template's framework-agnostic `configFragment` into the
  generated `refrakt.config.json` and injecting framework `target`/dependency wiring.
- Templates carry no post-scaffold update channel for their content; improvements reach authors
  as *new* templates to scaffold from, not as updates to existing projects.
- Because copied content references rune syntax that evolves, every first-party template must be
  scaffold-built in CI (and, where applicable, visually regressed via the {% ref "SPEC-094" /%}
  harness) so rune-syntax drift can't silently rot a template.
- The shared install/resolution helper ({% ref "SPEC-110" /%}) branches on artifact kind:
  dependency-add for themes, scaffold-copy for templates.
- Section/page-level templates, if introduced later, inherit the same copy semantics (a
  one-page template is still copied, not depended upon).

## References

- Site templates spec: {% ref "SPEC-109" /%}.
- Shared install robustness (resolution vs. apply semantics): {% ref "SPEC-110" /%}.
- Framework-agnostic theme packages (why themes are live dependencies): ADR-009.
- Theme system foundations (CI gallery/visual-regression harness): {% ref "SPEC-094" /%}.
- Scaffolding today: `packages/create-refrakt/src/scaffold.ts`,
  `packages/create-refrakt/src/bin.ts`.

{% /decision %}
