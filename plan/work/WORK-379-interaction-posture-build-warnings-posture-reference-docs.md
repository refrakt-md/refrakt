{% work id="WORK-379" status="done" priority="low" complexity="simple" source="SPEC-090" tags="composability, validation, docs, a11y" milestone="v0.20.0" %}

# Interaction-posture build warnings + posture reference docs

Emit the interaction-posture build warning and document the posture in the reference + composability docs.

## Acceptance Criteria
- [x] A genuinely-interactive guest in a linked tile emits a build warning (still renders presentationally; informative, not fatal).
- [x] `card`/`bento` reference + composability docs document the posture (presentational-by-default, `href`-wins demotion, cover backdrop) and the build warning.

## Approach
SPEC-084 validation philosophy. SPEC-090 §2 + Docs.

## References

- {% ref "SPEC-090" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-090-media-guest-posture`

### What was done
- Build warning: `warnInteractiveGuestInLink` in `packages/transform/src/engine.ts` — *"interactive guest `<g>` in a linked `<container>` — its controls are inert under the whole-tile link. Drop `href` or the interactivity."* Informative, not fatal; the guest still renders presentationally. Deduped once per `container:guest`.
- Docs:
  - `site/content/extend/rune-authoring/composability.md` — new "Media-guest interaction posture" section (presentational-by-default + the `interactive` capability, `href`-wins demotion, cover backdrop, content-controls-stay-interactive, the build warning, full-bleed-widgets out of scope).
  - `site/content/runes/card.md` — "Media guests in a linked card" subsection under Whole-card links.
  - `site/content/runes/marketing/bento.md` — posture note in the Media zones section.
  - All cross-linked to the composability contract anchor.

### Notes
- Follows SPEC-084's validation philosophy (build warnings, open-world — a rune participates by declaring `interactive`).

{% /work %}
