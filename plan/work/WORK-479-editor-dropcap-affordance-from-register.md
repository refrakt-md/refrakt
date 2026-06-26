{% work id="WORK-479" status="done" priority="medium" complexity="moderate" source="SPEC-108" milestone="v0.26.0" tags="reading,prose,editor,dropcap" %}

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

- [x] The editor surfaces the `dropcap` toggle by deriving it from the resolved register (rune `defaultReading` + layout/region default + author override), not a per-rune list: the toggle appears iff the body resolves to `reading="prose"` and reacts to changing the register.
- [x] The register resolution and the `prose → dropcap` capability mapping are exposed to the editor rather than hardcoded; the editor reuses `resolveReading()` + `READING_CAPABILITIES`.

## Dependencies

- {% ref "WORK-476" /%} — the shared resolver + capability table.
- {% ref "WORK-478" /%} — the dropcap opt-in the toggle drives.

## References

- Spec: {% ref "SPEC-108" /%} §3 (editor consequence). Affordance class distinct from `editHints`.
- `packages/editor/app/src/lib/components/BlockCard.svelte` (current `editHints` read).

## Resolution

Completed: 2026-06-26

Branch: `claude/spec-108-editor-dropcap`

### What was done
- **Server join** (`packages/editor/src/server.ts`): added `makeRuneConfigResolver()` — resolves each rune's `RuneConfig` from the assembled theme config the way the identity transform does (PascalCase `typeName` for core runes, else separator-insensitive kebab `name`/aliases for plugin runes, e.g. `pullquote`→`PullQuote`). `handleGetRunes` now attaches the rune's `defaultReading` to the `/api/runes` payload (catalog + community runes).
- **Client type** (`packages/editor/app/src/lib/api/client.ts`): `RuneInfo` carries optional `defaultReading`.
- **Register-gated affordance** (`RuneAttributes.svelte`): imports `resolveReading` + `READING_CAPABILITIES` from `@refrakt-md/transform`; computes the block's resolved register reactively (`resolveReading({ authorAttr: attributes.reading, runeDefault: runeInfo.defaultReading })`) and filters out register-gated capability attributes unless the resolved register unlocks them. `dropcap` therefore shows iff the body resolves to `prose` and appears/disappears as the author flips `reading=`. The gated-attr set is derived from `READING_CAPABILITIES` keys, so new capabilities gate for free — no per-rune list, no hardcoded `prose→dropcap` rule. Mirrors the existing `isSplitOnly` context-gating pattern.
- **Test** (`packages/editor/test/rune-config-resolver.test.ts`): covers the name↔config join (typeName, separator-insensitive name, plugin-by-name, fine/unset, unknown). 27 editor tests green; server `tsc` + app `vite build` clean.

### Notes
- `regionDefault` is intentionally omitted from the editor's `resolveReading` call: per the shared contract a region default seeds only the bare body, never a rune, so it cannot change a rune block's resolved register (the editor edits rune blocks). The bare article body reaches dropcap by wrapping its opening passage in `textblock` (a rune, `defaultReading: prose`) under the identical rule — so no layout/route lookup is needed, and the result is engine-faithful. A region-level "drop-cap the first paragraph" flag is explicitly out of scope per SPEC-108 §3.
- The gating reuses the engine's own `resolveReading`/`READING_CAPABILITIES` (already unit-tested in `transform/reading.test.ts`), so the editor never duplicates engine logic. A manual editor pass is still worthwhile to confirm the visual affordance, but the join + resolution are unit-guarded.

{% /work %}
