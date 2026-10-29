{% work id="WORK-664" status="done" priority="medium" complexity="simple" source="SPEC-160" tags="runes, section, media, frame" milestone="v0.44.0" pr="refrakt-md/refrakt#729" %}

# section takes guest-fit

The native `hero` and `feature` host a media guest with `guestFit: 'bleed'`, a config field.
A config field cannot differ between compositions that place the same `section`, and `hero`
needs `bleed` where a card-like composition needs `clip` ({% ref "SPEC-160" /%} D7).

## Acceptance Criteria

- [x] `section` accepts `guest-fit="clip | bleed"`, default `clip`, emitted as `data-guest-fit` on its media zone, as the config field emits it today
- [x] `frame`'s default `frame-displace-mode` and its `frame-overflow="bleed"` check read the resolved attribute, falling back to the config field
- [x] Native runes keep `guestFit` in config, and their output is unchanged on both contract copies
- [x] The section docs page documents `guest-fit`

## Blocked by

- {% ref "WORK-652" /%}: `section`'s media zone (v0.43.0)

## References

- {% ref "SPEC-160" /%}: D7.

## Resolution

Completed: 2026-10-29

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/runes/src/tags/section.ts`: `guest-fit` attribute (`clip | bleed`), emitted into the field bag in the split path.
- `packages/transform/src/engine.ts`: reads `guest-fit` from the field bag and folds it over `config.guestFit` before facets run, so the media zone's `data-guest-fit`, `frame`'s displace-mode default and the `frame-overflow` check all see the resolved value. Not a modifier, so nothing lands on the root.
- Tests in `packages/runes/test/section-split.test.ts`; docs on `site/content/runes/section.md`; `rune-attributes.json` regenerated.

### Notes
- Native `hero`/`feature` keep `guestFit: 'bleed'` in config; contracts are unchanged on both copies.

{% /work %}
