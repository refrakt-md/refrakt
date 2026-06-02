{% work id="WORK-321" status="done" priority="high" complexity="moderate" source="SPEC-082" tags="runes,transform,serialization,data-channel,fields" milestone="v0.18.0" %}

# Reserved `fields` attribute + schema dual-emit

Step 1 of {% ref "SPEC-082" /%}. Introduce the typed field-data channel: rune
schemas write their field values to a single reserved attribute,
`data-rune-fields`, holding a JSON-encoded object — produced by
`createComponentRenderable` (`properties` populate it). Keep emitting the legacy
`<meta data-field>` children in parallel (dual-emit) so behavior is unchanged.
No engine changes in this step.

## Acceptance Criteria

- [x] Reserved attribute key chosen and documented — working name
  `data-rune-fields`; value is a JSON-encoded `Record<string, FieldValue>` where
  `FieldValue = string | number | boolean | string[]`.
- [x] `createComponentRenderable` writes its `properties` into `data-rune-fields`
  on the node, **in addition to** the existing `<meta data-field>` emission.
- [x] Values are typed where natural (e.g. `servings` → number); JSON quotes are
  escaped against the attribute delimiter by the serializer.
- [x] No output change — the engine still reads the legacy metas this step; the
  rendered HTML is byte-identical. Full suite + contracts green.
- [x] Unit test at the helper level: a renderable's `properties` appear both in
  `data-rune-fields` (typed, parsed) and as the legacy metas.

## References

- {% ref "SPEC-082" /%} — typed node data channel.

## Resolution

Completed: 2026-06-02

Branch: claude/rune-contract-hardening

### What was done
- `createComponentRenderable` (packages/runes/src/lib/component.ts) now projects scalar `properties` into a single reserved `data-rune-fields` attribute on the root — a JSON-encoded object — in addition to the legacy `<meta data-field>` children (dual-emit). Keys stay as authored (camelCase, matching modifier names — no kebab transit). Only `<meta>` carriers with a `content` attribute contribute a value; content-marker properties (cursors of real content tags, e.g. budget's `category`) get `data-field` but no field entry. Values are preserved with their JS type (a numeric `content` stays a number in the JSON).
- Engine (packages/transform/src/engine.ts): added `data-rune-fields` to the consumed-attribute destructure so it is stripped from rendered output. The engine does NOT read it yet (that's WORK-322) — this keeps step 1 output-neutral.

### Verification
- `refrakt inspect` confirms api/budget/symbol now carry `data-rune-fields` on the (pre-strip) root with camelCase keys; the attribute is absent from final rendered output (stripped).
- Full suite green (3052 tests; one heavy real-file dogfood test flaked once under parallel load, passed on rerun and in isolation). Added 3 helper-level unit tests in component.test.ts (dual-emit + typed values; content-marker exclusion; omitted-when-empty).

### Notes
- Reserved key: `data-rune-fields` (consistent with the `data-*` convention). `FieldValue = string | number | boolean | string[]`.
- No output change: the attribute is internal and stripped; the engine still reads the legacy metas. WORK-322 switches the engine to read `fields` (dual-read).

{% /work %}
