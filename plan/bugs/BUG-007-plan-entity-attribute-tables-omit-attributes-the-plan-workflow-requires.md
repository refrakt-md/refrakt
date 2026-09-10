{% bug id="BUG-007" status="confirmed" severity="major" milestone="v0.33.0" tags="docs,plan,reference" %}

# Plan entity attribute tables omit attributes the plan workflow requires

`site/content/plan/docs/plan-entities.md` documents the attributes of `{% spec %}`,
`{% work %}`, `{% bug %}`, `{% decision %}`, and `{% milestone %}`. **All five
tables are incomplete**, and two of the omissions are attributes the project's
own mandatory workflow depends on.

Measured against `refrakt reference <rune> --format json --site plan`:

| Rune | Documented | Real | Missing |
|---|---|---|---|
| `spec` | 5 | 8 | `released-in`, `created`, `modified` |
| `work` | 8 | 12 | `pr`, `supersedes`, `created`, `modified` |
| `bug` | 7 | 10 | `pr`, `created`, `modified` |
| `decision` | 6 | 8 | `created`, `modified` |
| `milestone` | 3 | 5 | `created`, `modified` |

No ghosts — nothing documented that doesn't exist. The failure is one-directional.

## Expected

The page documenting plan entity attributes lists the attributes those entities
accept, including the ones the workflow requires.

## Actual

**`spec` omits `released-in`.** `CLAUDE.md:365`: *"Flip after `npm run release`,
paired with `released-in="vX.Y.Z"` (**validate errors** on a shipped spec with no
`released-in`)."* The reference page omits the one attribute `plan validate`
refuses to ship a spec without.

**`work` and `bug` omit `pr`.** `CLAUDE.md:335` makes it step 2 of the mandatory
completion checklist — *"the structured source of truth for traceability"* — and
`CLAUDE.md:357` says *"**Never** skip the `--resolve` summary or the `pr`
attribute."* Neither entity's table mentions it.

**`work` omits `supersedes`**, which CLAUDE.md documents as the pairing for a
`superseded` work item (*"validate warns if it's missing"*).

**All five omit `created` / `modified`**, the timestamp attributes
`packages/content/src/timestamps.ts` reads.

The consequence is that the plan workflow is only fully documented in
`CLAUDE.md`. A contributor reading the reference page — the page that exists to
describe these attributes — cannot learn that `pr` or `released-in` exist, let
alone that they are required.

## Steps to reproduce

```bash
npm run build
node packages/cli/dist/bin.js reference work --format json --site plan
# → own: id, status, priority, complexity, assignee, milestone, source,
#        supersedes, pr, tags, created, modified
grep -c '^| `' site/content/plan/docs/plan-entities.md   # the work table lists 8
```

Note the `--site plan` flag: the plan runes come from `@refrakt-md/plan`, which
is only in the `plan` site's plugin set. Without it the command reports "Unknown
rune".

## Root cause

Same as {% ref "BUG-006" /%} — hand-copied attribute tables with nothing checking
them — but on a page outside `/runes/`. `scripts/check-rune-docs.mjs` only
considers pages under the rune catalogue, so this page is invisible to the one
guard that exists.

## Acceptance Criteria
- [ ] `spec` documents `released-in`, `created`, `modified`
- [ ] `work` documents `pr`, `supersedes`, `created`, `modified`
- [ ] `bug` documents `pr`, `created`, `modified`
- [ ] `decision` and `milestone` document `created`, `modified`
- [ ] `released-in` and `pr` are marked as required by the workflow, not merely listed
- [ ] The page's prose does not contradict `CLAUDE.md` on when each is mandatory

## Approach

Fix by hand, as with {% ref "BUG-006" /%} — the data is one CLI call away and the
edit is mechanical.

Do not merely add rows for `pr` and `released-in`. Their significance is that
they are *required at a particular point in the lifecycle*, and a bare row in a
table does not convey "validate will error without this". Say so where the
lifecycle is described.

`created` / `modified` are the opposite case: they are maintained by tooling
rather than authored, so they should be listed as such rather than presented as
fields to set by hand.

## References

- {% ref "BUG-006" /%} — the same class of drift on `/runes/` pages
- {% ref "SPEC-128" /%} — generating these tables; its scope is widened to cover pages like this one, which are not under `/runes/`
- `CLAUDE.md` — the plan workflow that depends on the undocumented attributes

{% /bug %}
