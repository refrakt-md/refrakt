{% milestone name="v0.20.1" status="active" %}

# v0.20.1 — Surface model: docs & showcase

A documentation-and-showcase patch on top of v0.20.0. The surface model shipped
with per-rune reference docs; this milestone makes it *land* — a cohesive
showcase of the vocabulary as a system — and consolidates the composition docs.
No new runtime features.

## Delivered

- {% ref "WORK-380" /%} — the surface model **on one page**: chrome, fills, cover,
  and posture shown together, with the reference tables inline. Delivered by folding
  the gallery into `surfaces.md` rather than a separate page (SPEC-086–090).
- {% ref "WORK-346" /%} — the composition catalogue, **consolidated into the single
  `media-guests` page** under a renamed **Essentials** nav group (the IA reorg that
  removed the surfaces↔compositions duplication; surface treatments stay in
  `surfaces`, recipes in `media-guests`, rules in the composability contract).
- {% ref "WORK-382" /%} — a live **three.js scene as a media guest** (the "the media
  zone runs a program" flex) plus an ES-module-from-CDN example on the `sandbox`
  reference page.

## Moved to v0.21.0

The remaining items are really **registry / sandbox-integration** material, so they
move to {% ref "WORK-350" /%} and {% ref "WORK-381" /%}'s new home, the v0.21.0
milestone (registry-driven composition and sandbox integration):

- {% ref "WORK-350" /%} — the index bento showcase (held pending its content; v0.21.0
  gives it registry-fed cells worth showing).
- {% ref "WORK-381" /%} — sandbox lazy/poster activation (the prerequisite for heavy
  live cells / data-bound visualizations).

## Still open (unassigned candidate)

- {% ref "WORK-293" /%} — ship the client-behaviors bundle in the `@refrakt-md/html`
  scaffold (carried from v0.18.0). Unrelated to either the surface model or the
  registry work — a standing backlog item to re-home or schedule on its own.

{% /milestone %}
