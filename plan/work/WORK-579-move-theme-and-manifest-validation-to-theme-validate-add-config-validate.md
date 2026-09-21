{% work id="WORK-579" status="done" priority="medium" complexity="simple" milestone="v0.36.0" source="SPEC-135" tags="cli, themes, validation" pr="refrakt-md/refrakt#624,refrakt-md/refrakt#630" %}

# Move theme and manifest validation to theme validate, add config validate

Three artifacts share the word "config", and `refrakt validate` currently
validates the two that belong to **theme authors** under a name that reads like
a **site author's** command:

| Artifact | Who writes it | Checked by |
|---|---|---|
| `refrakt.config.json` | site author | the published JSON Schema — editors only |
| `ThemeConfig` (`prefix`, rune configs) | theme author | `validateThemeConfig` — what `--config <path>` calls |
| Theme manifest | theme author | `validateManifest` — what `--manifest` calls |

This item moves the theme pair to the group that already exists for them, so
{% ref "WORK-578" /%} can give the bare command back to site authors.

## Why the `theme` group, and not something new

`bin.ts:23-29` dispatches five noun groups — `theme`, `template`, `plugins`,
`config`, `reference`. Subcommands are this CLI's general shape for "acting on
a named thing", not a plugin convention. `theme` already holds `install`,
`info` and `list`; `theme validate` slots in beside them. `config migrate`
already exists, so `config validate` does too.

Being a *core* concern does not argue against a group — `config` is as core as
anything in the product and has one.

## Acceptance Criteria

**Part A — the vacation. No dependencies; land this first.**

- [x] `refrakt theme validate` runs `validateThemeConfig` and `validateManifest`, taking the paths `--config` / `--manifest` take today
- [x] `--config` and `--manifest` are gone from the bare `refrakt validate`, not aliased through a deprecation window
- [x] `refrakt theme validate` with no arguments reports what it found no input for, rather than validating `baseConfig` and printing success
- [x] Help text and docs describe `theme validate` as theme-authoring and `refrakt validate` as site-authoring
- [x] The changeset notes the moved flags

**Part B — `config validate`. Needs {% ref "WORK-578" /%}'s resolution layer to exist.**

- [x] `refrakt config validate` runs the config-resolution layer alone, through the same function {% ref "WORK-578" /%} calls — not a second implementation

## Approach

Mostly a relocation: the two validators already exist in
`@refrakt-md/transform` and the command already calls them. The work is
dispatch, help text, and deciding what each command does when handed nothing.

**Part A can land before {% ref "WORK-578" /%}, and should.** It has no
dependency on `validateContent` — it only needs to vacate the bare command.
Doing it first makes WORK-578 a smaller diff, since the bare command is then
empty rather than being rewritten around existing flags.

**Part B cannot**, because there is no resolution layer for `config validate` to
call until WORK-578 builds one, and building a second implementation is exactly
what its criterion forbids. Hence the split above: this item ships in two
commits, with Part B landing after WORK-578 rather than the whole item waiting
on it.

That split is why there is no `## Blocked by` here — a whole-item edge would
hide Part A, which is unblocked, simple, and makes the next item easier. Do not
start Part B before WORK-578 is done.

## Notes

Retire rather than alias. Pre-1.0, and today's zero-argument behaviour is close
to a no-op, so nobody can be meaningfully depending on it. An alias would keep
the audience confusion alive for no one's benefit.

## References

- {% ref "SPEC-135" /%} — D12 (the `theme` group, and the alternatives rejected), D1 (the three artifacts)
- `packages/cli/src/bin.ts` — the noun-group dispatch at `:23-29`
- `packages/cli/src/commands/validate.ts` — what moves
- `packages/transform/src/validate.ts` — `validateThemeConfig`

## Resolution

Completed: 2026-09-21

Branch: `claude/work-579a-theme-validate`, `claude/work-579b-config-validate`

Shipped in two commits, as the item's own approach anticipated.

### Part A — the vacation (PR #624)

`refrakt theme validate` takes `validateThemeConfig` and `validateManifest`,
with the paths `--config` / `--manifest` used to take. Those flags are retired
from the bare command rather than aliased (D2) and now error, naming where each
went.

Both commands also stopped reporting success on nothing — the defect D2 was
written for. Handed no arguments, the old command validated `baseConfig` and
printed a checkmark; in a user's project that is a self-test of the library
reported as a check of their work.

### Part B — `config validate` (PR #630)

`refrakt config validate`, beside the `config migrate` that already exists.
It calls `runValidation({ only: 'config' })` — **the same function `refrakt
validate` calls**, narrowed. The criterion forbids a second implementation, and
a test pins the two commands to identical findings for the same project, so a
divergent copy would fail rather than drift.

### Notes

- Part B waited for {% ref "WORK-578" /%}, which built the resolution layer.
  Part A did not, and landing it first is what made WORK-578 a small diff — the
  bare command was empty by then rather than being rewritten around existing
  flags.
- Found while testing Part A: Lumina's own shipped manifest fails
  `validateManifest`. Filed as {% ref "BUG-022" /%} rather than fixed here — the
  validator encodes the pre-{% ref "ADR-024" /%} manifest shape, so it also
  rejects every theme `create-refrakt` scaffolds.
- 4,652 tests pass.

{% /work %}
