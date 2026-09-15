{% work id="WORK-559" status="done" priority="medium" complexity="simple" milestone="v0.34.0" source="SPEC-132" tags="validation, config, dx" %}

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

- [x] A site-scoped config switch disables validation entirely
- [x] Individual error ids can be disabled, leaving the rest reporting
- [x] `critical` findings are reported regardless of configuration, with a test proving a disabled config still surfaces one
- [x] No per-page or per-tag suppression exists (D5)
- [x] The switch is described in the configuration reference, which is generated — so the field needs a `description` in `refrakt.config.schema.json` worth reading ({% ref "SPEC-126" /%})
- [x] Defaults are stated explicitly in the docs: which ids are on out of the box

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

## Resolution

Completed: 2026-09-15

Branch: `claude/milestone-v0-34-0-5zoab0`

### The decision the item asked for

> *Worth deciding once and recording: whether disabling an id suppresses the
> finding entirely or demotes it to `info`.*

**Demotion**, for the reason the item gives — and with one refinement it did not
anticipate. There are two different things a reader might call "off", and
collapsing them would have been wrong:

| case | outcome | why |
|---|---|---|
| id in `disableIds` | demoted to `info` | Someone actively judged *this* id unimportant. It should leave the build summary but stay visible to anyone looking, so re-enabling it later is an informed choice. |
| id never in the allow-list | dropped | Nobody decided anything about it. An `info` stream of every check the project has declined would be noise with no reader. |
| `enabled: false` | dropped | "Turn the pass off" should turn it off, not convert it to a quieter pass. |
| `critical` | reported | Not configurable at all (D11). |

The middle two are the refinement: demotion applies to a deliberate act, not to
the absence of one.

### What was done

- `packages/content/src/validate.ts` — `disableIds` demotes rather than drops;
  the three dispositions are tabulated in `validatePage`'s doc comment.
- `packages/transform/refrakt.config.schema.json` — new `ValidationConfig`
  definition, referenced from both the per-site properties and the deprecated
  top-level shorthands, with a description on the object and on each of the
  three fields.
- `packages/types/src/config.ts` — `validation?` on `SiteConfig` and on
  `RefraktConfig` (as a deprecated shorthand, matching `sandbox`).
- `scripts/generate-config-reference.mjs` — a `validation` group, so the field
  lands in the generated reference instead of failing the generator's
  "fields with no group" check.
- `site/content/docs/configuration/reference.md` — a **Content validation**
  section: a table of the five default ids and what each catches, a note that
  `variable-undefined` is not something to switch on and why, and a hint
  covering the `critical` rule and the absence of per-page suppression.
- `packages/content/test/validate.test.ts` — 6 more tests (25 total).

### Verification

| Check | Result |
|---|---|
| `npm run build` | exit 0 |
| `npx vitest run` | **4427 passed**, 362 files |
| `site/` build | `✓  Build complete (0 errors, 35 warnings)` |
| Rendered reference | `Content validation` section present; `disableIds`, `enabled`, `ids` and the default id list all render |
| `npm run format:check` | clean |

### Notes

**Two guards caught the change, both correctly.** `config-schema.test.ts`'s
drift guard rejected a schema property with no matching TypeScript interface
field — which is what sent `validation?` into `SiteConfig` *and* `RefraktConfig`
rather than only the first. And `generate-config-reference.mjs` refuses to emit
a field it cannot group, which is what produced the `validation` group rather
than a silently missing reference entry. Both are the pattern
{% ref "SPEC-126" /%} argued for, working.

**The generator does not flatten `$ref` sub-properties**, so the reference shows
one `validation` row rather than one per option — the same as `sandbox`,
`highlight` and `runes`, which all have the same shape. Rather than
hand-maintain a table that would drift (exactly what SPEC-126 was about), the
three option names and the default id list are named **inside the schema's own
description**, so they render from the single source of truth. Flattening one
level would be a genuine improvement to the generator and touches every
`$ref`-typed field, so it belongs in its own change rather than riding here.

**The test for "no per-page or per-tag suppression" pins the settings shape**
rather than asserting an absence in behaviour. An absence cannot be tested
directly; the realistic way the rule gets broken is someone adding a field, so
that is what the assertion watches.

**This completes SPEC-132.** All thirteen of the spec's acceptance criteria are
met across {% ref "WORK-554" /%} through {% ref "WORK-559" /%}, with two
corrections to the spec recorded along the way: D11's severity table is wrong
for the pinned Markdoc ({% ref "WORK-556" /%}), and the `attribute-*-invalid`
ids take their level from the attribute schema rather than being fixed at
`error` ({% ref "WORK-558" /%}).

{% /work %}
