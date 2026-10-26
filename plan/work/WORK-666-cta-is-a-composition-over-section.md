{% work id="WORK-666" status="draft" priority="medium" complexity="moderate" source="SPEC-160" tags="runes, composition, marketing, cta, section" milestone="v0.44.0" %}

# cta is a composition over section

`cta` becomes a `section` with a header and `{% actions %}`, with no rune CSS of its own
({% ref "SPEC-160" /%} D7).

## Acceptance Criteria

- [ ] A composed `cta` definition places one `section` with its header and `{% actions %}` around an actions slot
- [ ] It declares `defaults: { width: full, elevation: flush }`, the native `cta`'s defaults
- [ ] Two leading headings render as a headline and body, no longer as an eyebrow and a headline ({% ref "ADR-046" /%}); the changeset names this
- [ ] Rendered beside the plugin `cta` for every gallery fixture, light and dark; every difference is listed and explained
- [ ] `cta--in-hero` and `cta--in-pricing` are each kept, moved or dropped, with the reason recorded (SPEC-160 D7 leaves them to re-examine)
- [ ] The plugin `cta` is unchanged; replacing it is a later step

## Open before ready

Button size, as in {% ref "WORK-665" /%}; decided once for both.

## Blocked by

- {% ref "WORK-663" /%}
- {% ref "WORK-654" /%}: `actions` (v0.43.0)

## References

- {% ref "SPEC-160" /%}: D7.

{% /work %}
