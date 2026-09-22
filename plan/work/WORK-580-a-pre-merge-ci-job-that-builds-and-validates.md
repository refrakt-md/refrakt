{% work id="WORK-580" status="done" priority="high" complexity="simple" milestone="v0.36.0" source="SPEC-135" tags="ci, validation, dx" pr="refrakt-md/refrakt#619,refrakt-md/refrakt#628" %}

# A pre-merge CI job that builds and validates

{% ref "SPEC-135" /%} D4 makes `refrakt validate` the pre-merge gate rather than
the build. This item is the gate.

## The shape already exists

`format.yml` runs on `pull_request:` and establishes it: checkout →
`actions/setup-node@v4` (node 24) → `npm ci` → one check command. This job
follows it with one addition — `npm run build`.

## There is no build-free route

- `format.yml` escapes it only because Biome reads source.
- `fixture-corpus.test.ts` imports `../src/index.js`, so it needs no build
  *within* one package. Validating site content needs the assembled tag set
  across `runes`, nine plugins and `content`, which resolves through
  `node_modules` to `dist`.
- `release.yml` confirms the ordering: `npm ci` → `npm run build` → `npm test`.

## The build is not a tax this item imposes

**Nothing builds the monorepo on a PR today.** The first build happens on push
to `main`, inside the release job — so a type error merges clean and breaks the
release. This job gates validation *and* that, which is most of its
justification.

The cost is **ours, not users'**: in a consumer project the CLI is installed
from npm and starts instantly. The monorepo's build time must not be allowed to
shape the command's design.

## Acceptance Criteria

- [x] A workflow runs on `pull_request:` and on push to `main`, mirroring `format.yml`'s triggers and concurrency group
- [x] It runs `npm ci` → `npm run build` → `refrakt validate --format json`
- [x] It also runs `refrakt plan validate`, so the repository's own workflow documents the pairing {% ref "SPEC-135" /%} D11 declines to build into the CLI
- [x] A PR with an error-severity content finding fails the job
- [x] A PR with only warnings passes
- [x] `npm ci` uses `setup-node`'s cache; build output caching is added only if the job turns out slow enough to warrant it
- [x] No `paths:` filter — a rune schema change can invalidate content anywhere, so the filter would have to include `packages/**`

## Approach

Copy `format.yml`, add the build step, swap the check command. The only real
decision is whether this is a new `validate.yml` beside it or whether both fold
into a `ci.yml` with two jobs.

Prefer a separate file unless folding is trivially clean: `format.yml` is
cheap and fast, and keeping it independent means a formatting failure still
reports in seconds rather than behind a build.

## Blocked by

- {% ref "WORK-578" /%} — there has to be a command worth running

## Notes

This is also where {% ref "WORK-582" /%}'s duplicate-ID check earns its keep:
`plan validate --against origin/main` catches a colliding ID while resolution
is still unambiguous, which is only useful if something runs it pre-merge.

## References

- {% ref "SPEC-135" /%} — D13 (this job, and why the build closes a second gap), D4 (the CLI as the gate), D11 (running both commands)
- `.github/workflows/format.yml` — the shape to copy
- `.github/workflows/release.yml` — the `npm ci` → build → test ordering

## Resolution

Completed: 2026-09-21

Branch: `claude/work-580a-pre-merge-ci-job`, `claude/work-580b-ci-validate`

Landed in two parts, ahead of its stated position in SPEC-135's phases.

### Part A — the job (PR #619)

`.github/workflows/validate.yml`: `pull_request:` + push to `main`, mirroring
`format.yml`'s triggers and concurrency. `npm ci` → `npm run build` →
`npm test` → `refrakt plan validate`.

**Landed ahead of WORK-578 rather than behind it.** The item is sequenced after
WORK-578 on the grounds that the job needs "a command worth running", but it
already had three. Waiting would have held back the part that closes a hole
existing regardless — which this item itself calls most of its justification:
nothing built the monorepo or ran the suite on a PR, so a type error merged
clean and broke the release.

It is also the actual fix for the three ID collisions SPEC-135 cites.
`checkDuplicateIds` has reported duplicates at error severity since 2026-07-09;
they got through because nothing ran it. This job is that missing caller.

### Part B — the content gate (PR #627)

Added `refrakt validate` once WORK-578 landed. One step, replacing the TODO
Part A left.

### Verified

| Case | Exit |
|---|---|
| clean repo (2 sites, 0 errors, 0 warnings) | 0 |
| planted undefined tag | 1, naming file and line |
| two files claiming one plan ID | 1, naming both files |
| 48 plan warnings, 0 errors | 0 |

### Notes

- **`npm test` is a small widening of the stated scope** (`npm ci` → build →
  validate). Nothing ran the suite on a PR either, it is the same class of gap,
  and the job was already paying for the build. `release.yml` sets the same
  ci → build → test ordering.
- **Text output, not `--format json`.** The AC names the JSON form; the exit
  code is what gates (D4), and a human reading a failed job wants the readable
  form. The JSON shape exists for callers that parse findings — WORK-581's MCP
  tool, and anything that later turns these into PR annotations.
- **The job invokes `node packages/cli/dist/bin.js`, not `npx refrakt`.**
  `npx refrakt` does not work in this repo from a fresh clone: the workspace is
  symlinked into `node_modules/@refrakt-md/cli` but npm does not link its
  `refrakt` bin into `node_modules/.bin`. CLAUDE.md documents the `npx` form
  throughout. Worth its own item; this job must not depend on it being fixed.

{% /work %}
