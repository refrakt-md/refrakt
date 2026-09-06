{% work id="WORK-535" status="ready" priority="high" complexity="simple" source="SPEC-125" tags="cli,reference,dx" milestone="v0.32.0" %}

# Report a rune's actual universal attributes in refrakt reference

`refrakt reference card` prints:

> **Universal attributes (available on every rune):** tint, tint-mode, bg, width,
> **reading, dropcap**, spacing, inset, elevation, **prominence**, reveal,
> stagger, frame, …

On a card, `reading`, `dropcap` and `prominence` do nothing. The CLI states as a
fact something false about the rune it is describing — the symptom that opened
{% ref "SPEC-125" /%}.

Unlike language-server completion, this does **not** fall out of
{% ref "WORK-534" /%} for free: the line is a separate code path printing
`UNIVERSAL_ATTRIBUTE_NAMES` wholesale rather than reading the rune's schema.

## Acceptance Criteria

- [ ] The blanket "available on every rune" claim is gone
- [ ] The universal attributes reported for a rune are the ones its schema
      actually carries, read from the schema rather than from a static list
- [ ] `--format json` reports the same narrowed set, so machine consumers agree
      with the human output
- [ ] `refrakt reference list` and `refrakt reference dump` are consistent with
      the single-rune output
- [ ] No theme config is loaded to produce it
- [ ] A test pins the correction against a rune with known-inapplicable
      attributes, so the false claim cannot return
- [ ] `AGENTS.md` (or whatever `dump --check` guards) is regenerated if its
      content shifts
- [ ] `npm run build` and the full repo suite pass

## Approach

Worth deciding rather than defaulting: does an inapplicable attribute vanish
from the output entirely, or appear marked as unavailable?

Vanishing is simplest and matches the schema. But the structure contract already
records *why* an axis is unavailable on a rune ("this rune declares no body
section"), and surfacing that is more useful to someone wondering why `reading`
is missing from `card` when it is on `textblock`. Reference output is a teaching
surface, so the reason is probably worth showing — but it should be a choice, not
an accident of implementation.

## Blocked by
- {% ref "WORK-534" /%}

## References

- {% ref "SPEC-125" /%} — Phase 3
- {% ref "WORK-527" /%} — the contract entries carrying the reasons

{% /work %}
