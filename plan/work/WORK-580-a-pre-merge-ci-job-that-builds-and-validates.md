{% work id="WORK-580" status="ready" priority="high" complexity="simple" milestone="v0.36.0" source="SPEC-135" tags="ci, validation, dx" %}

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

- [ ] A workflow runs on `pull_request:` and on push to `main`, mirroring `format.yml`'s triggers and concurrency group
- [ ] It runs `npm ci` → `npm run build` → `refrakt validate --format json`
- [ ] It also runs `refrakt plan validate`, so the repository's own workflow documents the pairing {% ref "SPEC-135" /%} D11 declines to build into the CLI
- [ ] A PR with an error-severity content finding fails the job
- [ ] A PR with only warnings passes
- [ ] `npm ci` uses `setup-node`'s cache; build output caching is added only if the job turns out slow enough to warrant it
- [ ] No `paths:` filter — a rune schema change can invalidate content anywhere, so the filter would have to include `packages/**`

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

{% /work %}
