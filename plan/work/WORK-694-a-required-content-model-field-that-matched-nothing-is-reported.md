{% work id="WORK-694" status="done" priority="medium" complexity="moderate" source="SPEC-186" tags="content-model, resolver, validation" milestone="v0.47.0" pr="refrakt-md/refrakt#759" %}

# A required content-model field that matched nothing is reported

SPEC-186 D4: a required field, group or member that took no node is reported `content-missing`, and a child a required field skips is no longer dropped.

## Acceptance Criteria
- [x] A required field, group or member that took no node is reported `content-missing`, naming the field and the rune
- [x] A child skipped by a required field stays for the next field, and is reported `content-unmatched` only if nothing takes it
- [x] A sweep of `site/content`, the SEO fixtures and the composed fixtures lists every `content-missing`, and each is fixed or its field made optional
- [x] `content-missing` is a warning in this release; its promotion to an error is a follow-up item

## References

- {% ref "SPEC-186" /%}: D4.

## Resolution

Completed: 2026-11-03

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/runes/src/lib/resolver.ts`:
  - `noteMissing` records required fields that took no node on the sink: a skipped required field, one reached after the children ran out, a failed required group, an unreserved required `position: last`, and nested members, dotted;
  - `findMissingFields`;
  - a required non-match no longer advances past (drops) the child.
- `packages/runes/src/lib/index.ts`: `content-missing` findings at `CONTENT_MISSING_LEVEL = 'warning'`.
- `packages/content/src/validate.ts`: `content-missing` in `DEFAULT_VALIDATION_IDS`.
- Tests: resolver tests updated for D4.2 plus a new ran-out case; the validate id list test.
- Docs: content-models guide, configuration reference.
- WORK-701 created: the promotion to an error.

### Sweep
- `refrakt validate` on the main, staging and plan sites; SEO fixtures (53), core rune fixtures (41), plugin fixtures and composed-storytelling fixtures, each validated with its own tags.
- Zero `content-missing`. A positive control (a playlist with no title) reported one, so the harness was live. Nothing needed fixing or making optional.

### Notes
- The behaviour change: content after an unmatched node that no later field can take is now reported rather than read by a later field. That is D4.2 as specified, and the sweep found no page where it occurs.

{% /work %}
