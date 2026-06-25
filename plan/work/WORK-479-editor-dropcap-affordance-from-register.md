{% work id="WORK-479" status="ready" priority="medium" complexity="moderate" source="SPEC-108" milestone="v0.26.0" tags="reading,prose,editor,dropcap" %}

# Editor dropcap affordance derived from the register

Make the block editor surface the `dropcap` toggle by deriving it from the resolved reading
register rather than a per-rune list. Per {% ref "SPEC-108" /%} §3 (editor consequence) + Work
breakdown 4.

## Scope

- Expose what the editor needs without duplicating engine logic: (a) the register resolution as
  shared/derivable data (the editor already reads `RuneConfig` for `editHints`, giving
  `runeDefault`; additionally expose the active layout's content-slot `reading` for
  `regionDefault`); (b) the `READING_CAPABILITIES` table ({% ref "WORK-476" /%}) for the
  `prose → dropcap` mapping.
- The editor calls the same `resolveReading()` + `READING_CAPABILITIES` and shows the `dropcap`
  toggle iff the body resolves to `reading="prose"` — no per-rune list.
- Reactive: flipping a block to `reading="prose"` makes the toggle appear; back to `ui`/`fine`
  removes it. Note this is a distinct affordance class from `editHints` (which maps `data-name`
  sections to edit modes, not boolean toggles).

## Acceptance Criteria

- [ ] The editor surfaces the `dropcap` toggle by deriving it from the resolved register (rune `defaultReading` + layout/region default + author override), not a per-rune list: the toggle appears iff the body resolves to `reading="prose"` and reacts to changing the register.
- [ ] The register resolution and the `prose → dropcap` capability mapping are exposed to the editor rather than hardcoded; the editor reuses `resolveReading()` + `READING_CAPABILITIES`.

## Dependencies

- {% ref "WORK-476" /%} — the shared resolver + capability table.
- {% ref "WORK-478" /%} — the dropcap opt-in the toggle drives.

## References

- Spec: {% ref "SPEC-108" /%} §3 (editor consequence). Affordance class distinct from `editHints`.
- `packages/editor/app/src/lib/components/BlockCard.svelte` (current `editHints` read).

{% /work %}
