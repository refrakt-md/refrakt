{% work id="WORK-611" status="in-progress" priority="high" complexity="complex" source="SPEC-144" milestone="v0.39.0" tags="runes,pipeline,registry,declarative" %}

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

- [ ] A rune can declare `registers.entity` with `type`, `idFrom`, `scope`, `data` and `aliases`
- [ ] A rune can declare `registers.edge` with `from`, `to` and `kind`
- [ ] The declaration contains no function values and round-trips through `JSON.parse(JSON.stringify(…))`
- [ ] One core hook performs the registration for every rune carrying the block, in the existing Phase 2 / Phase 3 slots, beside — not replacing — `PluginPipelineHooks`
- [ ] A declaration naming a field that no emitted node, field-bag entry or attribute provides is reported at validate time, with file and line — the same treatment a schema-table source already gets
- [ ] `refrakt inspect` shows a rune's registration declaration
- [ ] The generated reference documents `registers` for every rune that carries one
- [ ] The plan plugin's pipeline is unchanged, and the authoring guide states SPEC-144's reach table — storytelling and design are reachable, plan is not, and why (D5)
- [ ] D3 (channel explicitness) is decided and the decision recorded in the resolution

## References

- {% ref "SPEC-144" /%} — mechanism, D1, D3, D5
- {% ref "SPEC-072" /%} — the relationship graph this declares into
- {% ref "ADR-036" /%} — why the vocabulary is closed

{% /work %}
