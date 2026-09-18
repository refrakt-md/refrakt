{% work id="WORK-579" status="ready" priority="medium" complexity="simple" milestone="v0.36.0" source="SPEC-135" tags="cli, themes, validation" %}

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

- [ ] `refrakt theme validate` runs `validateThemeConfig` and `validateManifest`, taking the paths `--config` / `--manifest` take today
- [ ] `refrakt config validate` runs the config-resolution layer alone, through the same function {% ref "WORK-578" /%} calls — not a second implementation
- [ ] `--config` and `--manifest` are gone from the bare `refrakt validate`, not aliased through a deprecation window
- [ ] `refrakt theme validate` with no arguments reports what it found no input for, rather than validating `baseConfig` and printing success
- [ ] Help text and docs describe `theme validate` as theme-authoring and `refrakt validate` as site-authoring
- [ ] The changeset notes the moved flags

## Approach

Mostly a relocation: the two validators already exist in
`@refrakt-md/transform` and the command already calls them. The work is
dispatch, help text, and deciding what each command does when handed nothing.

**Can land before {% ref "WORK-578" /%}.** It has no dependency on
`validateContent` — it only needs to vacate the bare command. Doing it first
makes WORK-578 a smaller diff, since the bare command is then empty rather than
being rewritten around existing flags.

`config validate` is the one part that does depend on WORK-578's resolution
layer existing; it can follow, or the item can ship in two commits.

## Notes

Retire rather than alias. Pre-1.0, and today's zero-argument behaviour is close
to a no-op, so nobody can be meaningfully depending on it. An alias would keep
the audience confusion alive for no one's benefit.

## References

- {% ref "SPEC-135" /%} — D12 (the `theme` group, and the alternatives rejected), D1 (the three artifacts)
- `packages/cli/src/bin.ts` — the noun-group dispatch at `:23-29`
- `packages/cli/src/commands/validate.ts` — what moves
- `packages/transform/src/validate.ts` — `validateThemeConfig`

{% /work %}
