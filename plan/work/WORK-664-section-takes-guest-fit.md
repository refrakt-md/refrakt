{% work id="WORK-664" status="ready" priority="medium" complexity="simple" source="SPEC-160" tags="runes, section, media, frame" milestone="v0.44.0" %}

# section takes guest-fit

The native `hero` and `feature` host a media guest with `guestFit: 'bleed'`, a config field.
A config field cannot differ between compositions that place the same `section`, and `hero`
needs `bleed` where a card-like composition needs `clip` ({% ref "SPEC-160" /%} D7).

## Acceptance Criteria

- [ ] `section` accepts `guest-fit="clip | bleed"`, default `clip`, emitted as `data-guest-fit` on its media zone, as the config field emits it today
- [ ] `frame`'s default `frame-displace-mode` and its `frame-overflow="bleed"` check read the resolved attribute, falling back to the config field
- [ ] Native runes keep `guestFit` in config, and their output is unchanged on both contract copies
- [ ] The section docs page documents `guest-fit`

## Blocked by

- {% ref "WORK-652" /%}: `section`'s media zone (v0.43.0)

## References

- {% ref "SPEC-160" /%}: D7.

{% /work %}
