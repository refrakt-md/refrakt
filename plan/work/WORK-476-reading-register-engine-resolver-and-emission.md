{% work id="WORK-476" status="done" priority="high" complexity="moderate" source="SPEC-108" milestone="v0.26.0" tags="reading,prose,transform,engine,architecture" %}

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

- [x] A `reading` role with the ordered set `fine | ui | prose` is emitted as `data-reading` refining `data-section="body"`; `ui` is the default and unmarked content is byte-unchanged.
- [x] A single pure `resolveReading()` (precedence author ▸ rune ▸ region ▸ `ui`) and the `READING_CAPABILITIES` table are exported as the shared contract; the region default seeds only the bare body, nested runes resolve from their own `defaultReading ?? 'ui'`.
- [x] `RuneConfig.defaultReading`, the universal `reading` attribute, and the content-`LayoutSlot` `reading` default all exist and feed the resolver; `coerceRegister()` drops invalid author values to the cascade.

## Dependencies

None. Foundational — the rest of SPEC-108 builds on this resolver + emission.

## References

- Spec: {% ref "SPEC-108" /%} §6 (data shape), §4 (assignment). Mirrors {% ref "SPEC-107" /%} axes.
- `packages/transform/src/engine.ts` (`data-section`/width emission), `packages/transform/src/types.ts` (`RuneConfig`, `LayoutSlot`).

## Resolution

Completed: 2026-06-25

Branch: `claude/spec-108-reading-role`

### What was done
- `packages/transform/src/reading.ts` (new) — the shared contract: `READING_REGISTERS`/`ReadingRegister`, `coerceRegister()` (validate-or-undefined), `resolveReading({authorAttr, runeDefault, regionDefault})` with precedence author ▸ rune ▸ region ▸ `ui`, `DEFAULT_READING`, and the `READING_CAPABILITIES` table (only `prose` → dropcap).
- `packages/transform/src/types.ts` — `RuneConfig.defaultReading?` and `LayoutSlot.reading?` (both `ReadingRegister`).
- `packages/transform/src/engine.ts` — resolves the rune's register (`author ?? defaultReading`, no region default at rune level) and emits `data-reading` on the `[data-section="body"]` element, suppressed at the `ui` default. Threaded through `applyBemClasses` + `applyProjection`.
- `packages/runes/src/lib/index.ts` + `attribute-presets.ts` — `reading` universal block attribute (`fine|ui|prose`).
- Re-exported the contract from `@refrakt-md/transform` and `@refrakt-md/runes`.
- `packages/transform/test/reading.test.ts` (new) — resolver precedence, typo-fallthrough, capability table, and engine emission (rune default, ui suppression, author override, invalid→default). Updated the reference test's universal-attr list.

### Notes
- The `LayoutSlot.reading` field + the resolver's `regionDefault` path exist; wiring the content-region default to the **bare article body** (the non-rune top-level markdown) is WORK-477, along with assigning the per-rune/layout default values. No rune sets `defaultReading` yet, so output is byte-unchanged and structure contracts are untouched.

{% /work %}
