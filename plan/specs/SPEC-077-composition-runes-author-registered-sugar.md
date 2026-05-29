{% spec id="SPEC-077" status="draft" tags="composition, runes, partials, slots, authoring, sugar" %}

# Composition runes — author-registered sugar via slots

A declarative mechanism for **site authors to register named, reusable
runes** whose body is a markdoc template composing other runes — filling the
gap between `{% partial %}` (file include with variables, no schema, no tag
name) and plugin-authored runes (TS schema + transform, full plugin
scaffold). Captures the design from a v0.16.0 brainstorm; held until there is
real demand from at least one site that's hitting the partials ceiling.

## Problem

Today there are two endpoints on the rune-authoring spectrum:

1. **Partials** (markdoc) — `{% partial file="dashboard-card.md" variables={title: "Work"} /%}`.
   Markdoc-authored, no code, body splatted at parse time. No tag name, no
   typed attribute schema, no catalog visibility.
2. **Plugin runes** (TypeScript) — full schema, custom transform, registered
   tag name (`{% plan-progress /%}`), tooling integration. Requires a plugin
   scaffold and TS code.

A clear middle ground is missing: **sugar runes** that are *pure
composition* of other runes (the canonical examples we've shipped — `backlog`
/ `decision-log` / `plan-activity` over `collection`, and the proposed
`plan-progress` over `aggregate` from {% ref "SPEC-076" /%}'s WORK-296) need
nothing from TS *except* a tag name and typed attributes. Forcing every
site-local composition into a plugin scaffold is heavy; forcing it through
the partials API loses the naming + typing + tooling wins. Two sites or one
site with five "dashboard card" variants in `_partials/` is a clear smell.

## Goals

- A **site-local file convention** — `_runes/<name>.md` parallel to
  `_partials/<name>.md` — that registers a markdoc-authored composition as
  a first-class rune (callable as `{% <name> /%}`).
- **Typed attributes** declared in frontmatter — same validation /
  tooling / catalog visibility a plugin rune gets.
- **Slot semantics for body content** — single anonymous slot in the simple
  case; multiple `---`-delimited named zones (matching the convention card /
  collection / aggregate already use) in the multi-zone case.
- **Optional-zone collapsing** via plain markdoc `{% if %}` — no new
  conditional-wrapper machinery; the zone-presence signal is just a boolean
  variable the author tests.
- **Reuse of existing infrastructure** — the splice machinery is the same
  one the deferred-body resolvers (collection, aggregate) already use, just
  binding *call-site* content into a *template* rather than `$item` data
  into a deferred body.

## Non-goals

- **Replacing plugin runes** for domain-aware sugar. The plan runes
  (`plan-progress`, `backlog`, `decision-log`, …) stay plugin code because
  they encode plan-domain semantics (entity types, status enums, sentiment
  mapping). Composition runes are for "this dashboard pattern I use across 5
  pages and want to name".
- **Composing across sites**. A composition rune lives with the site that
  defines it; if a pattern needs to ship cross-site, it earns a plugin.
- **Slot content as attribute values** (e.g. `{% card title=$header /%}`
  where `$header` is a slot's content). Real complexity jump; not v1.
- **Pass-through of unknown attributes** to the composed inner runes (the
  `$attrs` / `$$restProps` story). Not v1.

## Capability 1 — file convention + frontmatter schema

A site's `_runes/` directory (parallel to `_partials/`) holds one file per
composition rune. The filename (without `.md`) becomes the tag name.
Frontmatter declares typed attributes and the body's zone layout:

```markdoc
---
attributes:
  title: { type: string, required: true }
  variant: { type: string, default: "default", matches: ["default", "compact"] }
zones: [body, footer]
---
{% card %}
### {% $title %}
{% slot name="body" /%}
{% if $footer %}
---
{% slot name="footer" /%}
{% /if %}
{% /card %}
```

Authors then call the rune like any other:

```markdoc
{% dashboard-card title="Work" variant="compact" %}
Body content goes here.

{% aggregate type="work" %}…{% /aggregate %}
---
Last updated yesterday.
{% /dashboard-card %}
```

Frontmatter `attributes` shape mirrors the schema each plugin rune uses
today (`type`, `required`, `default`, `matches`, `description`). The
registration step turns it into a real markdoc tag schema, so attribute
validation, tooling (refrakt inspect, the rune catalog) and edit hints come
along for free.

## Capability 2 — slots and zones

The mechanism contributes two things the author works with:

- **`{% slot name="X" /%}`** — splices the X zone's parsed AST in place. The
  rune's transform walks the template, finds each slot marker, and
  substitutes the matching call-site zone's AST (the same splice machinery
  partials use to inline a parsed file).
- **`$X`** — a boolean truthy when the X zone exists in the call-site body,
  used by `{% if %}` to conditionally wrap surrounding chrome.

With a single anonymous slot (zones unset or `zones: [content]`), the entire
call-site body lands at one `{% slot /%}` marker — covering the common case
in one line of template.

## Capability 3 — optional zones via `{% if %}`

Optional zones use plain markdoc conditionals against the per-zone presence
boolean — no new tag machinery:

```markdoc
{% if $footer %}
---
{% slot name="footer" /%}
{% /if %}
```

When the call site omits the footer zone, `$footer` is falsy, the `{% if %}`
collapses, and the surrounding `---` divider goes with it. The card emits
just title + body. Composes naturally with `{% else %}` and richer
conditionals (`{% if $footer and $variant == "compact" %}`).

## What this absorbs

- **`_partials/<x>-card.md`** patterns where the partial is invoked many
  times with a slightly different chrome. Today these live as partials
  called via `{% partial %}`; under this mechanism they become first-class
  runes with names. The partials surface stays for *parameterless* file
  inclusion (boilerplate, license footers, etc.).
- **Plugin-scaffold-for-composition** patterns where a plugin exists only
  to register a sugar rune that's pure markdoc composition. The plan runes
  ({% ref "SPEC-076" /%}) are *not* this — they encode domain semantics —
  but a hypothetical "I want `{% feature-row /%}` site-wide" wouldn't need
  a plugin under this mechanism.

## Open design questions

These are real choices the implementer has to make; flagging them so a
future spec-from-draft pass doesn't get blocked.

- **Default zone variable name.** If `zones` is unset, the anonymous body
  splat needs *some* name. Candidates: `$body` (reads well, conflicts with a
  declared `body` zone), `$content` (less conflict-prone), `$children`
  (component-framework familiar). Probably `$content`.
- **Namespacing.** A site might want both `dashboard/card.md` and
  `marketing/card.md`. Folder structure → tag prefix? Bare filenames in a
  single namespace? Flat with an explicit `name:` frontmatter override?
- **Reserved names.** A composition rune can't shadow a plugin rune or a
  core rune. Define the precedence chain (core < plugin < site composition?
  the other way?) and what happens on collision.
- **Recursive composition.** A composition rune calling another composition
  rune should work. Infinite-recursion guard via a max-depth counter or
  a visited-set; the same pattern partials already use.
- **HMR.** Editing a composition rune file should hot-reload pages that
  call it, the same way partials do today.

## Why this is held

The mechanism is *cleanly designed* — slots reuse the deferred-body splice
machinery, optional zones reuse `{% if %}`, frontmatter attributes reuse the
existing schema shape — so it's small to build relative to its surface
area. What's missing is **demand**. The current plan / docs sites haven't
felt the partials ceiling. Until at least one site is hitting it (multiple
near-duplicate partials with attribute-shaped variation, or a site author
asking for "I want my own runes without writing a plugin"), the right move
is to capture the design and wait.

The point at which to revisit: a second or third "we'd want a composition
rune for this" observation on the refrakt site, the plan site, or a real
external site that's started using refrakt at depth. Until then this draft
is the artifact.

## References

- {% ref "SPEC-070" /%} — `collection`; many of the would-be composition
  runes (backlog, decision-log, plan-activity) are sugar over this.
- {% ref "SPEC-072" /%} — `relationships`; another sugar candidate.
- {% ref "SPEC-076" /%} — `aggregate`; the plan-progress decomposition
  (WORK-296) is the canonical "sugar over a generic rune" case that
  surfaced this question.

{% /spec %}
