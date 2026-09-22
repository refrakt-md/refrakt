{% work id="WORK-586" status="ready" priority="medium" complexity="moderate" source="SPEC-135" tags="cli, validation, config" %}

# Resolve routeRules layout names and entityRoutes types in the config layer

{% ref "WORK-578" /%} built `refrakt validate`'s config layer and deliberately
left two of its four checks partial. This finishes them.

## What ships today

`validateSiteConfig` (`packages/cli/src/commands/validate-config.ts`) resolves
`theme` and every `plugins[]` entry through `createRequire`, exactly as an
adapter resolves at build time. Those two are the ones that cause the
`tag-undefined` cascade {% ref "SPEC-135" /%} D1 is about, so they were the ones
worth having first.

The other two are placeholders:

| Check | Today | Wanted |
|---|---|---|
| `routeRules[].layout` | only when the theme declares layouts **inline** — the uncommon shape | resolve the theme's actual layout set |
| `entityRoutes[].type` | non-empty string | matches a **registered** type |

## Why they were deferred rather than guessed

Both need more than the config file.

`routeRules[].layout` needs the theme's layout set, which lives in the theme
module and its manifest — so checking it means importing the theme package.
That is the expensive half of config resolution, and a wrong layout name is
already caught by the layout cascade at build time.

`entityRoutes[].type` is harder: a *registered* type only exists after the
register phase, which is the `--deep` tier. There is nothing to compare against
during a fast-tier run.

Guessing was the option not taken, and for the reason D1 exists: an unresolvable
theme already reports its own error, and a second wave of derived findings —
"layout X is not declared", once per rule — would be the symptom drowning the
cause all over again. `collectDeclaredLayouts` returns `undefined` rather than
an empty set precisely so the check suppresses itself instead of firing on
nothing.

## Acceptance Criteria

- [ ] `routeRules[].layout` is checked against the layout set the site's theme actually declares, not only the inline-object shape
- [ ] The check suppresses itself — reporting nothing, rather than flagging every rule — when the theme cannot be resolved, so it never fires on top of an unresolvable-theme error
- [ ] `entityRoutes[].type` is checked against registered types under `--deep`, where the registry exists
- [ ] Under the default tier, `entityRoutes[].type` keeps its current shape check and does not claim more than it verified
- [ ] Importing the theme to read its layouts does not move the default tier's cost into build territory — measure it, and put it behind `--deep` if it does
- [ ] A test covers a `routeRules` rule naming a layout the theme does not declare
- [ ] A test covers an `entityRoutes` rule naming a type nothing registers

## Approach

`routeRules` first: it is the tractable one, and the layout set is knowable from
the theme package without running a pipeline.

`entityRoutes` genuinely needs the registry, so it belongs in the `--deep` path
beside the cross-page checks. Resist making the default tier pay for it — D3's
whole point is that the default is fast enough to run on every save, and a
command nobody runs on save is the thing this milestone exists to stop
producing.

**Check the cost before choosing the tier.** `refrakt validate` on this repo runs
in ~9s by default against ~20s for `--deep`, and most of the 9s is CLI startup
and plugin loading rather than validation. Importing one more package may be
free or may not; measure rather than assume.

## Notes

Recorded as an amendment on {% ref "WORK-578" /%}'s criteria rather than checked
off, so the gap is visible in the item that shipped it as well as here.

## References

- {% ref "SPEC-135" /%} — D1 (the config layer checks resolution, and runs first), D3 (why the default tier stays fast)
- {% ref "WORK-578" /%} — built the layer; its criteria carry the amendment
- `packages/cli/src/commands/validate-config.ts` — `validateSiteConfig`, `collectDeclaredLayouts`
- `packages/content/src/registry.ts` — the registry `entityRoutes` types would resolve against

{% /work %}
