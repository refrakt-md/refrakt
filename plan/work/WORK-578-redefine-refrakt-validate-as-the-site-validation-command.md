{% work id="WORK-578" status="ready" priority="high" complexity="moderate" milestone="v0.36.0" source="SPEC-135" tags="cli, validation, dx" %}

# Redefine refrakt validate as the site validation command

`refrakt validate` with no arguments validates **`baseConfig`** — refrakt's own
built-in theme config (`packages/cli/src/commands/validate.ts:35`). It does not
read `refrakt.config.json`, does not look at the user's site, and never touches
content. In a user's project it is a self-test of the library, reported as
though it were a check of their work.

This item makes the command mean what its name says.

## The surface

```bash
refrakt validate                      # config resolution, then content, every site
refrakt validate --site main
refrakt validate --only content
refrakt validate --only config
refrakt validate --deep               # add the cross-page tier
refrakt validate --format json
```

`--site` is already parsed and deliberately discarded (`bin.ts:913`), with a
comment reserving it for exactly this.

## Two layers, in order

Config resolution runs **first**, because its failures cause content findings.
`packages/sveltekit/src/plugin.ts:166` catches a failed package load, warns to
console and continues with that plugin's runes absent — so post-
{% ref "SPEC-132" /%} every use of them is a `tag-undefined` finding. Dozens of
errors against correct content, cause: one line of config.

The config layer checks **resolution, not shape**. Shape is the published JSON
Schema's job and editors already enforce it.

## Acceptance Criteria

- [ ] `refrakt validate` with no arguments validates content and config for every site in `refrakt.config.json`
- [ ] It never validates `baseConfig` as a stand-in for the user's project
- [ ] It never reports success when it validated nothing — standing in a directory with no config and no content says so
- [ ] `--site <name>` restricts to one site, using the flag already parsed at `bin.ts:913`
- [ ] `--only content|config` narrows; both run when absent
- [ ] `--deep` runs the cross-page tier; the default does not
- [ ] `--format json` emits machine-readable findings
- [ ] The config layer checks resolution — `theme.package`, every `plugins[]` entry, `routeRules` layout names, `entityRoutes` types
- [ ] Config resolution runs before content validation, and a resolution failure annotates or suppresses the `tag-undefined` findings it causes rather than reporting both as peers
- [ ] Exit is non-zero when any finding is at error severity, zero otherwise
- [ ] Warnings never affect the exit code, and no `--strict` flag ships
- [ ] No advisory-finding category is built — {% ref "SPEC-135" /%} D10
- [ ] Docs cover the redefinition, including that the default behaviour changed

## Approach

Thin over {% ref "WORK-577" /%}. Once `validateContent` exists, this is
argument parsing, per-site iteration, output formatting and an exit code.

The config-resolution layer is the only genuinely new logic here, and it is
worth writing second: get content validation running end to end first, then add
the layer in front of it, so the ordering behaviour has something to order.

**Changeset note.** This changes a public CLI's default behaviour. Pre-1.0
under fixed-mode Changesets it is a minor, but the changeset should say plainly
what changed rather than leaving someone to discover it — even though today's
zero-argument path is close to a no-op, so nothing can meaningfully break.

## Blocked by

- {% ref "WORK-577" /%} — `validateContent` and the config seam

## Blocks

- {% ref "WORK-580" /%} — the CI job needs a command to run
- {% ref "WORK-581" /%} — the MCP tool mirrors this surface

## References

- {% ref "SPEC-135" /%} — D1 (site-scoped, two layers in order), D2 (`--only`, and `--config` leaving), D3 (tiers and the warnings rule), D4 (the exit code as the gate)
- `packages/cli/src/commands/validate.ts` — the `baseConfig` default this replaces
- `packages/cli/src/bin.ts` — the reserved `--site`
- `packages/sveltekit/src/plugin.ts` — the swallowed package-load failure that motivates the ordering

{% /work %}
