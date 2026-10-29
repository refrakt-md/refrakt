{% work id="WORK-666" status="done" priority="medium" complexity="moderate" source="SPEC-160" tags="runes, composition, marketing, cta, section" milestone="v0.44.0" pr="refrakt-md/refrakt#733" %}

# cta is a composition over section

`cta` becomes a `section` with a header and `{% actions %}`, with no rune CSS of its own
({% ref "SPEC-160" /%} D7).

## Acceptance Criteria

- [x] A composed `cta` definition places one `section` with its header and `{% actions %}` around an actions slot
- [x] It declares `defaults: { width: full, elevation: flush }`, the native `cta`'s defaults
- [x] Two leading headings render as a headline and body, no longer as an eyebrow and a headline ({% ref "ADR-046" /%}); the changeset names this
- [x] Rendered beside the plugin `cta` for every gallery fixture, light and dark; every difference is listed and explained
- [x] `cta--in-hero` and `cta--in-pricing` are each kept, moved or dropped, with the reason recorded (SPEC-160 D7 leaves them to re-examine)
- [x] The composed `cta`'s buttons match the plugin `cta`'s in size with no `cta.css`, through the default size of {% ref "WORK-665" /%}'s prominence rules (SPEC-160 D7)
- [x] The plugin `cta` is unchanged; replacing it is a later step

## Blocked by

- {% ref "WORK-663" /%}
- {% ref "WORK-665" /%}: the prominence-keyed button size in `actions.css`
- {% ref "WORK-654" /%}: `actions` (v0.43.0)

## References

- {% ref "SPEC-160" /%}: D7.

## Resolution

Completed: 2026-10-29

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/runes/test/fixtures/composed/cta.md`: one `section` with eyebrow, headline, blurb and body slots and `{% actions %}` around the actions slot; `align` (default `center`, forwarded); `defaults: { width: full, elevation: flush }`.
- `packages/content/test/composed-cta.test.ts`: beside the plugin for every gallery cell (default, eyebrow, command line): the same content in the same roles and the same action ranks, with each difference asserted.
- The changeset names the ADR-046 change: two leading headings now read as a headline and body.

### Differences from the plugin cta (Lumina, light and dark)
- **`data-rune`:** `cta`, not the plugin's `call-to-action`. The root is a block-less `div`, so there are no `rf-cta*` classes.
- **Headline:** `section`'s resting size, not `text-4xl`, and no gradient fill. The blurb is base size, not `text-lg`.
- **Padding:** the cta's 3.5rem / 2rem padding is gone (section rhythm, flush).
- **Not anchored to the measure at `width="wide"`:** the plugin's `contentMeasure` is not carried.
- **Buttons:** the same size, the default with no prominence, with no `cta.css`.
- **Alignment:** centred by `section`'s `align` rather than in CSS. An author can now set `align`.

### `cta--in-hero` and `cta--in-pricing`: both dropped
- A composed rune is block-less (SPEC-145 D2), so it has no BEM class for a context modifier to extend.
- `in-pricing` (left-aligned, compact) is now `align="start"` on the cta, which the author writes where it is wanted.
- `in-hero` only trimmed padding the composed cta no longer has.

### Notes
- The plugin `cta` is unchanged; replacing it is a later step.

{% /work %}
