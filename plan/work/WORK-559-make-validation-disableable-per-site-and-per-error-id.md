{% work id="WORK-559" status="ready" priority="medium" complexity="simple" milestone="v0.34.0" source="SPEC-132" tags="validation, config, dx" %}

# Make validation disableable per site and per error id

{% ref "SPEC-132" /%} D5. Users have content we cannot anticipate, and a
framework that nags them about a diagnostic they disagree with — or worse,
refuses to build — is one they turn off wholesale. Give them a narrow switch so
they do not reach for a wide one.

## The shape, and why it is narrow

Configurable **per site** and **per error id**. Deliberately *not* per page and
not per tag: that granularity invites silencing the one call site that revealed
a real bug, which is how a validation feature becomes decoration.

`critical` findings are not suppressible at all (D11). They mean the document
could not be understood — a parse error, an unclosed tag — which is not a matter
of preference. Only the `error` band is configurable.

## Acceptance Criteria

- [ ] A site-scoped config switch disables validation entirely
- [ ] Individual error ids can be disabled, leaving the rest reporting
- [ ] `critical` findings are reported regardless of configuration, with a test proving a disabled config still surfaces one
- [ ] No per-page or per-tag suppression exists (D5)
- [ ] The switch is described in the configuration reference, which is generated — so the field needs a `description` in `refrakt.config.schema.json` worth reading ({% ref "SPEC-126" /%})
- [ ] Defaults are stated explicitly in the docs: which ids are on out of the box

## Approach

Land it in the same release as {% ref "WORK-556" /%}, not after. A validation
feature that ships without an escape hatch teaches users to distrust the next
one, and the hatch is cheap — it is a config field and a filter, reusing the
allow-list {% ref "WORK-556" /%} already builds.

Worth deciding once and recording: whether disabling an id suppresses the
finding entirely or demotes it to `info`. Demotion keeps it visible to anyone
looking while removing the noise, which is usually the better default for a
diagnostic someone has actively judged unimportant.

## References

- {% ref "SPEC-132" /%} — D5 and D11
- {% ref "WORK-556" /%} — builds the allow-list this configures
- {% ref "SPEC-126" /%} — the generated configuration reference this field joins

{% /work %}
