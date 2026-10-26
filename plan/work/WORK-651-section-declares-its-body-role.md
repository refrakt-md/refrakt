{% work id="WORK-651" status="done" priority="high" complexity="trivial" source="SPEC-160" tags="runes, section, composition, primitives" milestone="v0.43.0" pr="refrakt-md/refrakt#721" %}

# section declares its body role

`section`'s sections declare `preamble`, `headline` and `blurb` but no `body`, so `reading` and
`dropcap` silently do nothing on a section. This is the case
`packages/transform/src/section-roles.ts` exists to catch ({% ref "SPEC-160" /%} D1). It stands
on its own and is the first step of SPEC-160's order.

## Acceptance Criteria

- [x] `sectionSections` declares `body: 'body'`, and `reading` / `dropcap` take effect on a section's body, asserted in a test
- [x] Every existing `section` fixture renders unchanged apart from the body role, and the contract diff on both copies is reviewed

## References

- {% ref "SPEC-160" /%}: D1.
- {% ref "ADR-041" /%}.

## Resolution

Completed: 2026-10-26

Branch: `claude/v0-43-0-review-ny4nl1`

### What was done
- `packages/runes/src/tags/section.ts`: `sectionSections` declares `body: 'body'`, and the schema declares `provides: ['prose']`. `packages/runes/src/config.ts`: the `Section` entry declares `provides: ['prose']`.
- `packages/runes/test/section-roles.test.ts`: tests that `data-section="body"`, `data-reading` and `data-dropcap` land on a section's body.
- `packages/lumina/test/prose-capability.test.ts`: the body-role audit counts 33. `section` is audited as a prose body.
- Contracts: `Section` no longer lists `reading` and `dropcap` as unavailable.

### Notes
- The body role alone was not enough. `reading` is offered only on a rune that provides `prose`, which is default-off, so `section` needed both, the way `card` has them.

{% /work %}
