{% work id="WORK-200" status="done" priority="high" complexity="moderate" tags="lumina, palette, tokens, neutral-default" source="SPEC-051" milestone="v0.14.0" %}

# Neutral default body palette (light + dark)

Author Lumina's new default body palette — the warm-neutral surface, monochrome primary, and supporting tokens. Light surface anchors at `#f6f4ef`, dark surface inverts to `#1c1a17`. All thirteen base color tokens specified explicitly in {% ref "SPEC-051" /%}. Replaces the current cream-and-navy values; the cream-and-navy palette gets extracted as the `tideline` preset in {% ref "WORK-204" /%}.

## Acceptance Criteria

- [x] Light-mode body palette implemented per the SPEC-051 token table:
  - [x] `color.bg = #f6f4ef`
  - [x] `color.text = #1c1a17`
  - [x] `color.muted = #6b6661`
  - [x] `color.border = #e8e5df`
  - [x] `color.surface.base = #fcfaf6`
  - [x] `color.surface.raised = #ffffff`
  - [x] `color.surface.hover = #efece5`
  - [x] `color.surface.active = #e8e5df`
  - [x] `color.primary = #1c1a17`
  - [x] `color.primary-hover = #3a342d`
  - [x] `color.code.bg = #ebeae8`
  - [x] `color.code.inline-bg = #e6e5e3`
  - [x] `color.code.text = #1c1a17`
- [x] Dark-mode body palette implemented per the SPEC-051 token table (values from the table's "Dark" column)
- [x] `color.primary-scale` (50→950) ramp implemented along the warm-neutral axis — eleven stops from near-bg to near-text. Hand-pick values; tooling verifies monotonicity
- [x] Code surface (`code.bg`, `code.inline-bg`) uses lower chroma than the page bg per the SPEC-051 "chroma step-down" principle — verified visually that code blocks don't read as brown
- [x] CSS coverage tests pass against the new palette
- [x] Visual review: at least one page of refrakt content (a docs page with body, code, headings, callouts) renders against the new palette and reads as "calm warm neutral" rather than "cream" or "grey"

## Approach

Authors the values directly into Lumina's base `ThemeTokensConfig` (post-{% ref "WORK-191" /%}). The values are fully specified — this is a transcription, not a design decision, except for `primary-scale` which is a hand-pick task (the spec calls out the ramp axis but not exact stops).

For `primary-scale`, walk the warm-neutral hue at low chroma from `~L 0.97` (near `bg`) to `~L 0.20` (near `text`) in eleven roughly-perceptually-uniform steps. Use OKLCH for the picks; export hex. Tooling can verify the L progression is monotonic and roughly even.

Status palette ({% ref "WORK-202" /%}) and syntax palette ({% ref "WORK-201" /%}) are sibling work items — they don't block this one but should be done in the same milestone so Lumina ships a fully populated contract.

## Dependencies

- {% ref "WORK-185" /%} — types ready.
- {% ref "WORK-191" /%} — Lumina migrated to config-driven tokens. (This work item rewrites those values; can't happen until they're authored as config.)

## References

- {% ref "SPEC-051" /%} — "The Neutral Default" section with full token table
- `packages/lumina/src/config.ts` (post-WORK-191) — file being edited

{% /work %}
