{% work id="WORK-370" status="done" priority="low" complexity="simple" source="SPEC-088" tags="surfaces, bg, config, docs" milestone="v0.20.0" %}

# Formalize the bg raw-CSS escape hatch + project-config backgrounds merge

Promote `BgPresetDefinition.style` to a documented, intentional last-resort escape hatch and confirm the project-config `backgrounds` home with merge-over-theme semantics.

## Acceptance Criteria
- [x] `BgPresetDefinition.style` is documented with a stated contract (raw CSS on the bg layer, bypasses tokens, author owns portability), valid in both theme and project config.
- [x] Project `backgrounds` (`refrakt.config.json`) merge over theme `backgrounds`.

## Approach
Same project-vs-theme split as SPEC-087 named recipes. SPEC-088 §2.

## References

- {% ref "SPEC-088" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-088-bg-gradients-scrim`

### What was done
- Documented `BgPresetDefinition.style` as an intentional last-resort escape hatch (raw CSS on the bg layer, bypasses tokens, author owns portability) in `bg.md`, valid in theme **and** project config.
- Confirmed project `backgrounds` (`refrakt.config.json`) merge over theme `backgrounds`: already read in `sveltekit/config.ts` and merged via `assembleThemeConfig`/`mergeThemeConfig` (project wins by name); the new `gradient` field rides that path.

### Notes
- No new merge code needed — the plumbing existed; this was confirmation + docs.

{% /work %}
