{% work id="WORK-476" status="ready" priority="high" complexity="moderate" source="SPEC-108" milestone="v0.26.0" tags="reading,prose,transform,engine,architecture" %}

# Reading-register engine resolver + `data-reading` emission

Build the shared register-resolution contract and `data-reading` emission that the rest of
{% ref "SPEC-108" /%} hangs off. Per {% ref "SPEC-108" /%} §6 + Work breakdown 1.

## Scope

- **Vocabulary**: `READING_REGISTERS = ['fine','ui','prose'] as const` + `ReadingRegister` type,
  in a shared location importable by engine, validation, and editor.
- **Sources**: a universal `reading` block attribute (validated against the vocabulary, like
  `width`); `RuneConfig.defaultReading?: ReadingRegister` (mirroring `defaultWidth`/
  `defaultElevation`); a `reading?` default on the `content` `LayoutSlot`.
- **Resolver**: a pure `resolveReading({ authorAttr, runeDefault, regionDefault })` with precedence
  author ▸ rune ▸ region ▸ `ui`, plus a `coerceRegister()` that validates-or-undefined so author
  typos fall through to the cascade. The region default seeds **only the bare body**; nested runes
  resolve from their own `defaultReading ?? 'ui'`.
- **Emission**: emit `data-reading="<value>"` on the element carrying `data-section="body"`, and
  **suppress emission when the resolved register is `ui`** (the `width`-style `!== default` guard)
  so unmarked content stays byte-identical. Each `data-section="body"` resolves independently.
- **Capability table**: `READING_CAPABILITIES: Record<ReadingRegister, { dropcap: boolean }>` (only
  `prose` → true) as the single declarative source imported by engine + editor.

## Acceptance Criteria

- [ ] A `reading` role with the ordered set `fine | ui | prose` is emitted as `data-reading` refining `data-section="body"`; `ui` is the default and unmarked content is byte-unchanged.
- [ ] A single pure `resolveReading()` (precedence author ▸ rune ▸ region ▸ `ui`) and the `READING_CAPABILITIES` table are exported as the shared contract; the region default seeds only the bare body, nested runes resolve from their own `defaultReading ?? 'ui'`.
- [ ] `RuneConfig.defaultReading`, the universal `reading` attribute, and the content-`LayoutSlot` `reading` default all exist and feed the resolver; `coerceRegister()` drops invalid author values to the cascade.

## Dependencies

None. Foundational — the rest of SPEC-108 builds on this resolver + emission.

## References

- Spec: {% ref "SPEC-108" /%} §6 (data shape), §4 (assignment). Mirrors {% ref "SPEC-107" /%} axes.
- `packages/transform/src/engine.ts` (`data-section`/width emission), `packages/transform/src/types.ts` (`RuneConfig`, `LayoutSlot`).

{% /work %}
