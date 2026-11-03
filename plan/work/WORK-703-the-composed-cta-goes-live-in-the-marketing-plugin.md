{% work id="WORK-703" status="ready" priority="high" complexity="simple" source="SPEC-181" tags="runes, composition, marketing, cta, go-live" milestone="v0.48.0" %}

# The composed cta goes live in the marketing plugin

`site/staged-runes/cta.md` was reviewed with the hero in {% ref "WORK-689" /%}. It goes live on
the path {% ref "WORK-702" /%} opens: the marketing plugin's `runeDir`.

## Gates (SPEC-181 rollout)

1. and 2. Reviewed, and every difference explained: done in WORK-689.
3. The composition adds `align` (`start | center | end`), which the plugin cta does not declare;
   that is additive, so no existing content changes meaning. This item confirms no other attribute
   or content form differs, or adds the codemod and waits a release.
4. No dependency on a `draft` primitive spec: confirmed when the item starts.

## Acceptance Criteria
- [ ] `cta.md` moves from `site/staged-runes/` into the marketing `runeDir` unchanged, and the `staging` site's `runes.prefer` entry for `cta` is removed
- [ ] The plugin cta's schema, theme config entry and `cta.css` are removed, and the CSS coverage sets are updated
- [ ] Both copies of `contracts/structures.json` and the SEO baseline are regenerated, and the diff is reviewed in the PR description
- [ ] The cta reference page describes the rune as a composition, and every page that uses `cta` renders unchanged
- [ ] A breaking changeset and a migration note list what authors and themes lose (`rf-cta*` classes) and what changed

## Blocked by
- {% ref "WORK-702" /%}

## References
- {% ref "SPEC-181" /%}: the rollout gates and D5.
- {% ref "WORK-689" /%}: the review.

{% /work %}
