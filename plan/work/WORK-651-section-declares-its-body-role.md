{% work id="WORK-651" status="ready" priority="high" complexity="trivial" source="SPEC-160" tags="runes, section, composition, primitives" milestone="v0.43.0" %}

# section declares its body role

`section`'s sections declare `preamble`, `headline` and `blurb` but no `body`, so `reading` and
`dropcap` silently do nothing on a section. This is the case
`packages/transform/src/section-roles.ts` exists to catch ({% ref "SPEC-160" /%} D1). It stands
on its own and is the first step of SPEC-160's order.

## Acceptance Criteria

- [ ] `sectionSections` declares `body: 'body'`, and `reading` / `dropcap` take effect on a section's body, asserted in a test
- [ ] Every existing `section` fixture renders unchanged apart from the body role, and the contract diff on both copies is reviewed

## References

- {% ref "SPEC-160" /%}: D1.
- {% ref "ADR-041" /%}.

{% /work %}
