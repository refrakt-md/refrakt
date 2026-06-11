{% work id="WORK-390" status="ready" priority="medium" complexity="moderate" source="SPEC-093" milestone="v0.21.0" tags="sandbox,showcase,threejs,registry,relationships" %}

# Plan relationship-graph showcase

The second data-bound showcase — and a dogfood: the **plan's own relationship
graph**. SPEC-072 edges are already live and *populated* (the plan plugin calls
`relate()` for spec↔work↔decision↔milestone), so this needs no SPEC-092 work.

## Scope
- Add the `graph` data-shape to the data-bound sandbox: nodes + SPEC-072 edges
  (via `getRelated`), serialised into `RF_DATA` as `{ nodes, edges }`.
- A showcase: a force-directed 3D graph of the plan (`spec → work → decision →
  milestone`), nodes linking to entity pages.

## Acceptance Criteria
- [ ] `data-shape="graph"` resolves nodes + SPEC-072 edges into `RF_DATA`.
- [ ] A plan relationship-graph showcase renders the force-directed graph; nodes link to their entities.
- [ ] **Authored fallback** is an honest `relationships` list; `prefers-reduced-motion` static frame; **lazily mounted**.

## Dependencies
- {% ref "WORK-388" /%} (data-bound sandbox core) and {% ref "WORK-381" /%} (lazy/poster mount).

## References
- {% ref "SPEC-093" /%} · SPEC-072 (relationship edges — `relate`/`getRelated`, already populated by the plan plugin) · `packages/content/src/registry.ts`

{% /work %}
