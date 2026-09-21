{% milestone name="v0.36.0" status="planning" %}

# v0.36.0 — Validation reach

v0.34.0 connected `Markdoc.validate()` to site content. The findings exist. This
milestone is about the fact that **nobody can reach them.**

## Why

{% ref "WORK-554" /%} planted a synthetic error-severity diagnostic and watched
every surface:

| Surface | Exit code | What appeared |
|---|---|---|
| `vite build` in `site/` | **0** | `✗  Build complete (1 error, 35 warnings)` on stderr |
| `vite build` in `plan-site/` | **0** | same |
| `npx vitest run` (4,402 tests) | **0** | nothing — no test observes the count |
| `vite dev` | n/a | **nothing at all** |

The dev-server row is the damaging one, and it is a reporting gap rather than a
missing pipeline. Content in dev loads through `createRefraktLoader`, which
calls `loadContent` internally — so `site.pipelineWarnings` is fully populated,
sitting on the cached site object, and nothing reads it. The pipeline does the
work of producing diagnostics on every content edit and throws them away.

Three more surfaces are missing entirely:

- **`refrakt validate`** — the command whose name promises this validates
  `baseConfig`, refrakt's own built-in theme config. In a user's project it is a
  self-test of the library, reported as though it were a check of their work.
- **MCP** — there is a `plan_validate` tool and no content equivalent, which is
  exactly the gap an agent falls into.
- **Pre-merge** — `format.yml` runs on `pull_request:`, but nothing validates
  and nothing builds. A type error merges clean and breaks the release job.

## The through-line

v0.34.0's was *"the checks were always written. Nothing was listening."* This
one continues it: **the findings now exist, and nobody can reach them.**

That is the same disease one step further along, which is why the duplicate-ID
work belongs here rather than beside. {% ref "SPEC-131" /%}'s branch hit three
ID collisions in two days — `SPEC-133`, `BUG-015`, `BUG-019` — one of them
corrupting the spec rollups before a human noticed.

**And the sharpest finding in this milestone is that the check for them already
exists.** `checkDuplicateIds` has reported duplicates at error severity, naming
both files, since 2026-07-09 — two months before those collisions — with tests
covering it. All three were detectable by a command nobody ran.

So this is not a cheap check absent. It is a cheap check *present, correct,
tested, and unwired* — which is worse, because its presence in the source reads
as coverage. Closing that gap is not writing the check again; it is
{% ref "WORK-580" /%}, the job that runs it without anyone choosing to.

Which makes the milestone's own thesis sharper than when it was written: **a
check with no automatic caller is indistinguishable from a check that does not
exist.** `content:check-links` and `runes:check-docs` are npm scripts nothing
invokes. Every row of {% ref "WORK-554" /%}'s table was a finding computed and
dropped. This is the same shape a fourth time, and the only one where the
machinery was already complete.

## What lands

{% ref "SPEC-135" /%} carries the design. Six pieces:

- {% ref "WORK-575" /%} — the reporter seam at `loadContent`, and the dev-server
  print. No behaviour change for any consumer, so it carries none of the
  exit-code debate. Split out of {% ref "WORK-573" /%}, which keeps that half.
- {% ref "WORK-577" /%} — `validateContent` and the extracted config seam. The
  entry point everything else sits on, and where the agreement test lives: the
  fast tier must produce the same findings as a build, or the gate contradicts
  the thing it gates.
- {% ref "WORK-578" /%} — `refrakt validate` redefined as the site command, with
  {% ref "WORK-579" /%} vacating the theme-authoring half into
  `theme validate`, a group that already exists.
- {% ref "WORK-580" /%} — the PR job. Builds, validates, and runs
  `plan validate` beside it.
- {% ref "WORK-581" /%} — the MCP tool, returning structured findings rather
  than a rendered report.
- {% ref "WORK-582" /%} — duplicate IDs: `--against <ref>` to catch collisions
  while resolution is still unambiguous, and `plan migrate ids` to resolve them
  when it can prove what each reference meant. Smaller than first planned — see
  below.

Plus {% ref "BUG-021" /%}, found while establishing that the CLI and the build
cannot disagree: the top-level `validation` shorthand is declared in the types,
in the JSON Schema and in the generated reference, and read nowhere. The
validation feature's own configuration, silently doing nothing when set the
documented way.

## The build in CI is not a tax this milestone imposes

{% ref "WORK-580" /%} adds `npm run build` to a PR job, and there is no
build-free route — validating site content needs the assembled tag set across
`runes`, nine plugins and `content`, which resolves through `node_modules` to
`dist`.

That cost buys two things. Nothing builds the monorepo on a PR today, so the
job gates validation *and* closes a hole that exists regardless. And the cost is
**ours, not users'**: in a consumer project the CLI is installed from npm and
starts instantly.

## Deliberately not here

- **Making a build fail.** {% ref "WORK-573" /%} keeps the exit-code half, and
  {% ref "SPEC-135" /%} D4 exists so this milestone does not depend on it — a
  command with its own exit code gives a gate without changing build semantics
  for every downstream adapter.
- **An advisory-finding category.** {% ref "SPEC-134" /%}'s review markers would
  produce them, but that spec is draft and unscheduled. Reserve the seam in the
  docs, write no code.
- **Post-merge collision resolution.** Possible with line-level `git blame`;
  out of scope because prevention removes the case and a wrong guess repoints a
  reference silently.
- **Redesigning `loadContent`.** Fourteen positional parameters get an
  options-bag overload here, not a redesign. That question is
  {% ref "WORK-576" /%}, on v1.0.0, where a public function's shape is still
  free to change.

## Minor, not patch

`refrakt validate` changes what it does with no arguments, and `--config` /
`--manifest` move to `theme validate`. That is a behaviour change to a public
CLI. Pre-1.0 under fixed-mode Changesets it is a minor — but it deserves saying
plainly in the changeset rather than being discovered.

{% /milestone %}
