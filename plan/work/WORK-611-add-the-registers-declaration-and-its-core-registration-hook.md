{% work id="WORK-611" status="done" priority="high" complexity="complex" source="SPEC-144" milestone="v0.39.0" tags="runes,pipeline,registry,declarative" pr="refrakt-md/refrakt#669" %}

# Add the `registers` declaration and its core registration hook

{% ref "SPEC-144" /%}'s mechanism. A rune declares that it registers a named entity
or an edge, and one core pipeline participant performs the registration in the
existing Phase 2 (register) / Phase 3 (aggregate) slots. The registry, the
relationship graph and the query runes (`collection`, `relationships`, `aggregate`)
are unchanged. This only gives them a declarative way in.

```yaml
registers:
  entity: { type, idFrom, scope, data: [...], aliases: { from, separator } }
  # or
  edge:   { from, to, kind }     # kind: a literal, or { field: … }
```

The vocabulary is closed ({% ref "ADR-036" /%}, D1): no expression form, no
predicate, no function values.

## Scope: registration only

Declarable *bounded sentinel resolution* (SPEC-144's revised D2, and its two
corresponding criteria) is **not** in this item or this milestone. Registration is
the independently valuable half, and the sentinel half migrates five core
`postProcess` instances, including `buildAutoBreadcrumb`, which
{% ref "BUG-018" /%} is changing in the same milestone.

## Open question to settle here

SPEC-144 D3, channel explicitness: whether `idFrom: name` must say `ref:` /
`field:`, or the implicit ref-then-bag fallback stands. The spec says to decide with
a migration in hand. {% ref "WORK-612" /%} is that migration, so record the decision
in this item's resolution, informed by it.

## Acceptance Criteria

- [x] A rune can declare `registers.entity` with `type`, `idFrom`, `scope`, `data` and `aliases`
- [x] A rune can declare `registers.edge` with `from`, `to` and `kind`
- [x] The declaration contains no function values and round-trips through `JSON.parse(JSON.stringify(…))`
- [x] One core hook performs the registration for every rune carrying the block, in the existing Phase 2 / Phase 3 slots, beside — not replacing — `PluginPipelineHooks`
- [x] A declaration naming a field that no emitted node, field-bag entry or attribute provides is reported at validate time, with file and line — the same treatment a schema-table source already gets
- [x] `refrakt inspect` shows a rune's registration declaration
- [x] The generated reference documents `registers` for every rune that carries one
- [x] The plan plugin's pipeline is unchanged, and the authoring guide states SPEC-144's reach table — storytelling and design are reachable, plan is not, and why (D5)
- [x] D3 (channel explicitness) is decided and the decision recorded in the resolution

## References

- {% ref "SPEC-144" /%} — mechanism, D1, D3, D5
- {% ref "SPEC-072" /%} — the relationship graph this declares into
- {% ref "ADR-036" /%} — why the vocabulary is closed

## Resolution

Completed: 2026-10-07

Branch: `claude/v039-registers`
PR: refrakt-md/refrakt#669

### What was done
- `packages/runes/src/lib/registers.ts`: the `RegistersDeclaration` vocabulary (`entity`: type/idFrom/scope/data/aliases; `edge`: type/from/to/kind/bidirectional/data), `validateRegistersDeclaration` (closed keys, inert values only, JSON round-trip; aliases.from and kind/bidirectional `{field}` must name bag keys), `schemaRegisters` WeakMap + `registersFor`, `readRegistersSource`, `auditRegistersSources`, `describeRegisters`.
- `packages/runes/src/registers-pipeline.ts`: `createRegistersHooks` (Phase 2 register; Phase 3 name index with first-alias-wins, unknown-endpoint warnings, `registry.relate` for edges with alias endpoints canonicalised to ids) and `composeRegistersHooks` (runs the participant inside the declaring package's hook set, beside its own hooks; a package with no `aggregate` gets `{ entityByName }` in its slot).
- `createContentModelSchema({ registers })` checks and records the block, and wraps the schema's `validate` with the source audit (`registers-source-unresolved`, warning, Markdoc attaches file/line). One extra transform per rune per process: sources seen resolved are cached per schema; the transform uses a copy of the page variables.
- `packages/content/src/site.ts`: core catalog and every plugin are composed with their declarations in `buildPreprocessHookSets`. `validate.ts`: id added to `DEFAULT_VALIDATION_IDS`.
- `refrakt inspect` (text "Registers" section with audit; `--json` `registers` field), `refrakt reference` (markdown + JSON `registers`).
- Docs: new `site/content/extend/rune-authoring/registration.md` (vocabulary, source rule, aggregate slot, SPEC-144 reach table incl. why plan is not reachable); pointers from plugin-authoring/pipeline, authoring-overview, configuration reference (validation id), relationships and bond pages.
- Tests: `packages/runes/test/registers.test.ts` (24), `packages/content/test/validate-content.test.ts` (file + line through the fast tier, build agrees).

### D3 — decided: the implicit ref-then-bag fallback stays
A source is a bare name: first a `data-name` node inside the rune (bounded at nested runes), then the `data-rune-fields` bag. `createComponentRenderable` throws on a property/ref name collision (ADR-008), so the two namespaces are disjoint per rune and a bare name has one meaning. The risk explicitness would catch — a typo registering an empty id — is caught instead by `registers-source-unresolved` at validate time, with file and line. The storytelling and design migrations needed no channel prefix anywhere: every data field resolved from the bag, every id/endpoint from a ref or the bag, with registries identical to the hand-written hooks.

### Notes
- "Beside, not replacing": one implementation, composed into each declaring plugin's hook set rather than run as a separate `__registers__` slot. That is what makes registration order, `getTypes()` order and warning attribution identical to the hooks it replaces.
- The ref lookup is bounded at nested runes (like `findAllByName`); storytelling's old `findByName` was not. They differ only when a rune lacks its own ref and a nested rune has one.
- Contracts and SEO baseline: no diff.
- Spec correction for SPEC-144: the "same treatment a schema-table source already gets" was inspect-time only (`inspect --audit`); registers sources now get both that and a validate-time finding.

{% /work %}
