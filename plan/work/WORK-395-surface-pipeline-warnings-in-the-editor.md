{% work id="WORK-395" status="ready" priority="medium" complexity="simple" tags="editor,warnings,preview,lints" %}

# Surface pipeline warnings in the editor

The engine grew a rich soft-lint system (posture demotion, escape-hatch
lints, nesting validation, entity-id collisions) but the editor actively
swallows it: `runPreviewPostProcess` in `packages/editor/src/preview.ts`
collects `PipelineWarning`s into an array and drops it, and hook errors hit
a bare `catch {}` ("degrade silently"). Authors only discover problems at
build time. Pipe warnings through to the UI as a validation rail.

This is the warning channel that {% ref "SPEC-098" /%}'s inline lints
build on.

## Acceptance Criteria
- [ ] Preview responses (`/api/preview`, `/api/preview-data`, and the
  block path) carry the `PipelineWarning`s produced during transform and
  postProcess instead of discarding them.
- [ ] PostProcess hook failures are no longer silently swallowed — they
  surface as an error-severity warning naming the plugin and rune.
- [ ] The editor shows a validation rail/panel listing warnings for the
  open page with severity, message, and source plugin; count badge when
  collapsed.
- [ ] Warnings attributable to a specific block (by rune position) show
  an inline indicator on that block card.
- [ ] Pages with zero warnings show nothing (no idle chrome).

## Approach
- Server: change `renderPreviewContent` / `runPreviewPostProcess` to
  return `{ html, warnings }`; replace the bare `catch {}` with an
  error-severity `PipelineWarning`. Thread warnings through the preview
  endpoints' JSON responses (full-document preview can embed them in a
  header or switch that endpoint to JSON + client-side injection).
- Attribution: the warning's `url`/message often identifies the rune;
  where the resolver provides a node position, map it to the block via
  the block parser's source ranges — best-effort, fall back to page-level.
- Client: warnings store in `editor.svelte.ts`; rail component in the
  editor chrome; per-block badge on `BlockCard.svelte`/
  `ProseBlockCard.svelte`.

## References
- {% ref "SPEC-098" /%} — consumes this channel for inline lints.
- `packages/editor/src/preview.ts` (lines 121–150: warnings collected
  then dropped), `packages/types` (`PipelineWarning`),
  `packages/editor/app/src/lib/state/editor.svelte.ts`.

{% /work %}
