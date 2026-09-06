{% work id="WORK-532" status="ready" priority="medium" complexity="simple" source="SPEC-125" tags="runes,config,validation,dx" milestone="v0.31.0" %}

# Lint slot/role mismatches

The twelve corrections in {% ref "WORK-529" /%}–{% ref "WORK-531" /%} were found
by an ad-hoc script comparing each rune's declared slots (from `layout`,
`structure`, `autoLabel`, `blocks`, `contentWrapper`) against its `sections` map.
Nothing stops the same drift returning the next time a rune gains a `body` slot.

Turn that comparison into a standing check.

## Acceptance Criteria

- [ ] A rune declaring a `body` slot with no `body` section role is flagged
- [ ] A rune declaring a `title`/`header` slot with no header-ish role is flagged
- [ ] The check runs over core **and** all nine plugins, not just `baseConfig`
- [ ] Genuinely bodyless runes (the 105 with neither a body role nor a body slot)
      produce no noise
- [ ] Runes deliberately left uncorrected in {% ref "WORK-529" /%}–{% ref "WORK-531" /%}
      have a recorded way to opt out, and the reason travels with the opt-out
      rather than living only in a work-item resolution
- [ ] The check fails CI rather than only warning
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

**Direction only.** This lints for a *missing* role. It must not flag a role that
is present — those are correct, and the `DataTable` / `Showcase` cases are an
overload of `body`'s meaning, not a data error. Flagging them here would push
someone toward the wrong fix (removing a role Lumina styles) instead of the right
one ({% ref "WORK-537" /%}).

Where it lives is worth a moment. `refrakt validate` already checks theme config
and is the obvious home, but the slot inputs come from four different config
fields and the existing ad-hoc script had to reconstruct them — so a shared
"declared slots for a rune" helper is likely the real deliverable, with the lint
as its first consumer. {% ref "WORK-534" /%} will want the same helper.

## Blocked by
- {% ref "WORK-529" /%}
- {% ref "WORK-530" /%}
- {% ref "WORK-531" /%}

## References

- {% ref "SPEC-125" /%} — Phase 1, *Guard against recurrence*

{% /work %}
