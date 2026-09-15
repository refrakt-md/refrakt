{% bug id="BUG-017" status="confirmed" severity="minor" source="SPEC-132" tags="bento, surfaces, applicability, docs, validation" %}

# bento documents a frame cascade the engine does not implement

`site/content/runes/marketing/bento.md` described grid-level `frame` chrome
cascading to every bento cell, and demonstrated it in a live preview:

```markdoc
{% bento columns=6 elevation="raised" frame-aspect="16/9" frame-anchor="center" %}
```

The engine does nothing with either attribute. `frame` is declared **unavailable**
on `bento` (SPEC-125 applicability), so the two attributes are parsed, dropped,
and no output is affected.

Found by the content validation SPEC-132 wired into the build — this was two of
the four `attribute-undefined` findings on a clean build of `site/`, and the
only ones not already explained.

## Steps to Reproduce

```bash
node packages/cli/dist/bin.js inspect bento --site main \
  --frame-aspect="16/9" --frame-anchor="center"
```

## Expected

Either the attributes take effect (per the prose: "`frame-aspect` and
`frame-anchor` feed bento's existing media knobs
`--bento-media-aspect` / `--bento-media-anchor`"), or they are rejected.

## Actual

Neither. The emitted `<section class="rf-bento">` and every `.rf-bento-cell`
carry no `--bento-media-aspect`, no `--bento-media-anchor`, and no `data-frame-*`.
The attributes vanish silently — BUG-014's symptom 1, fourth row, in the wild.

Confirmed against the declared applicability:

```
bento axes available:   bg, elevation, inset, motion, spacing, substrate, tint, width
bento axes unavailable: dropcap+reading, frame, prominence
```

So the engine is behaving as *declared*. It is the documentation that was wrong.

## Which half is the defect?

Genuinely open, which is why this is filed rather than fixed:

- **The docs were aspirational.** `elevation` cascades to cells and `frame` was
  described alongside it because the two are a pair on `card`. If `frame` was
  never wired for `bento`, the prose was wrong from the start.
- **Or applicability over-narrowed.** {% ref "SPEC-125" /%} has a precedent: the
  `scrim*` family was filed under the `cover` axis and thereby removed from 82
  of 83 runes before that was corrected. A second surviving case of the same
  mistake would look exactly like this.

Deciding needs someone who owns the surface model. Do not resolve it by editing
the applicability table until that is settled — `bento` has its own
`media-ratio` / `media-position` knobs, and `frame` may be deliberately excluded
to avoid two mechanisms for one effect, which is what the removed prose itself
claimed to be avoiding.

## Interim

The docs page now states the shipped behaviour: `frame` is unavailable on
`bento`, the attributes are dropped, and `media-ratio` is the supported way to
set a cell aspect. The preview no longer passes them. That keeps the page honest
and the build's validation findings at zero without pre-judging the design
question above.

## References

- {% ref "SPEC-132" /%} — the validation that surfaced this
- {% ref "BUG-014" /%} — symptom 1: an undeclared attribute is silently dropped
- {% ref "SPEC-125" /%} — theme-independent attribute applicability, and the `scrim` over-narrowing precedent
- `site/content/runes/marketing/bento.md` — the corrected page

{% /bug %}
