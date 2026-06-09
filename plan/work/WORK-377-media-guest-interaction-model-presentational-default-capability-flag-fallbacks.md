{% work id="WORK-377" status="done" priority="low" complexity="moderate" source="SPEC-090" tags="composability, runes, engine, a11y" milestone="v0.20.0" %}

# Media-guest interaction model: presentational default + capability flag + fallbacks

Define media guests as presentational by default with an explicit `interactive` capability and a static fallback per interactive guest.

## Acceptance Criteria
- [x] Media-slot guests are presentational by default; interactivity is an explicit guest capability (`codegroup`/`tabs`/`datatable`/`form`/`map`/`sandbox`/`juxtapose`/declared).
- [x] Each interactive guest defines a static presentational fallback (e.g. codegroup→default tab shown statically, tabs→first panel, map→snapshot, juxtapose→fixed split).

## Approach
Behaviour-driven runes in `@refrakt-md/behaviors`. SPEC-090 §1.

## References

- {% ref "SPEC-090" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-090-media-guest-posture`

### What was done
- `packages/transform/src/types.ts` — added `RuneConfig.interactive?: boolean` (interaction capability flag).
- `packages/runes/src/config.ts` — `interactive: true` on CodeGroup, TabGroup, DataTable, Form, Juxtapose, Sandbox; `plugins/places/src/config.ts` — on Map. The engine now knows which media guests are interactive.
- Static fallback: a demoted guest is not JS-enhanced (`packages/behaviors/src/index.ts` skips any `[data-rune]` inside a `[data-guest-posture="presentational"]` zone), so it renders its non-enhanced static form. `packages/lumina/styles/dimensions/guest-posture.css` hides the (statically-rendered but now inert) tab strip on demoted `codegroup`/`tabs` so panels read as plain stacked content; guests whose chrome is JS-injected (datatable toolbar, map controls) simply never appear.

### Notes
- The fallback is the guest's progressive-enhancement static render, made non-interactive — not a bespoke per-guest variant. This keeps the model open: any guest that declares `interactive` participates.

{% /work %}
