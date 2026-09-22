{% work id="WORK-578" status="done" priority="high" complexity="moderate" milestone="v0.36.0" source="SPEC-135" tags="cli, validation, dx" pr="refrakt-md/refrakt#626" %}

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

- [x] `refrakt validate` with no arguments validates content and config for every site in `refrakt.config.json`
- [x] It never validates `baseConfig` as a stand-in for the user's project
- [x] It never reports success when it validated nothing — standing in a directory with no config and no content says so
- [x] `--site <name>` restricts to one site, using the flag already parsed at `bin.ts:913`
- [x] `--only content|config` narrows; both run when absent
- [x] `--deep` runs the cross-page tier; the default does not
- [x] `--format json` emits machine-readable findings
- [x] The config layer checks resolution for `theme.package` and every `plugins[]` entry — the two that actually cause the `tag-undefined` cascade, resolved through `createRequire` exactly as an adapter would at build time
- [ ] **Partially met: `routeRules` layout names and `entityRoutes` types are not fully resolved.** `entityRoutes` entries are checked for a non-empty `type`, not for matching a *registered* type; `routeRules[].layout` is checked only when the theme declares its layouts inline, which is the uncommon shape. Both need the theme package imported and the registry populated — the expensive half, and for `entityRoutes` the registry only exists after the register phase, which is the `--deep` tier. Deliberately suppressed rather than guessed: an unresolvable theme already reports its own error, and a second wave of derived findings would be the exact symptom-drowning-the-cause failure D1 exists to prevent. Filed as {% ref "WORK-586" /%}
- [x] Config resolution runs before content validation, and a resolution failure annotates or suppresses the `tag-undefined` findings it causes rather than reporting both as peers
- [x] Exit is non-zero when any finding is at error severity, zero otherwise
- [x] Warnings never affect the exit code, and no `--strict` flag ships
- [x] No advisory-finding category is built — {% ref "SPEC-135" /%} D10
- [x] Docs cover the redefinition, including that the default behaviour changed

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

## Resolution

Completed: 2026-09-21

Branch: `claude/work-578-refrakt-validate`

### What was done

- `packages/content/src/refract-loader.ts` — `RefraktLoader.validateSite({ deep })`
  on both the FS and virtual loaders. It captures the `SiteLoaderOptions` the
  loader built and hands them to `validateContent` verbatim, so the fast tier
  gets the *same* assembled tag set, icons, file roots and validation settings
  the build would use. That is SPEC-135 D5a applied one level up: a caller that
  reassembled the context could silently disagree with the build about which
  runes exist. `deep: true` runs the full pipeline and keeps its `phase:
  'validate'` findings — a build without rendering.
- `packages/cli/src/commands/validate-config.ts` — the config-resolution layer.
  Checks resolution, not shape; `createRequire` from the config directory, which
  is how an adapter resolves at build time.
- `packages/cli/src/commands/validate.ts` — the command: site iteration, the
  two layers in order, text and JSON output, exit code.
- `packages/cli/src/bin.ts` — `--site`, `--only`, `--deep`, `--format`,
  `--config-path`, plus a `--strict` that refuses loudly rather than silently
  doing nothing.
- `site/content/docs/cli/theme-tools.md` — rewritten for the redefinition,
  including a callout that the default behaviour changed.

### Verified by hand, on this repo

| Case | Result |
|---|---|
| clean repo, 2 sites | `✓ 0 errors, 0 warnings`, exit 0 |
| planted `{% totallyfaketag %}` | `✗ error index.md:162 tag-undefined …`, exit 1 |
| `--format json` | `{file, url, line, severity, id, message}` |
| unresolvable plugin added to config | config error reported, content **skipped** with an explanation |
| no `refrakt.config.json` | "Nothing to validate", exit 1 |
| `--site nosuchsite` | names the declared sites, exit 1 |
| `--deep` vs default | 19.7s vs 9.3s |

17 CLI tests; 4,630 pass overall.

### Notes

- **A test of mine was wrong, and the code was right.** I asserted that
  `disableIds: ['tag-undefined']` should drop the exit code to zero. It does not:
  `tag-undefined` is Markdoc level `critical`, and D11 says no configuration
  silences a critical finding. `attribute-undefined` is level `error` and is
  suppressible. Both are now pinned as separate tests, which is better coverage
  than the assertion I started with.
- **One criterion is partially met, amended in place.** `routeRules` layout
  names and `entityRoutes` types are not fully resolved — both need the theme
  imported and the registry populated, and the registry only exists after the
  register phase (`--deep`). Suppressed rather than guessed, because a second
  wave of derived findings is exactly the symptom-drowning-the-cause failure D1
  exists to prevent. Worth its own item.
- The `--deep` gap is smaller than WORK-577's 8x because most of the default
  tier's 9.3s is CLI startup and plugin loading, not validation. The tiering
  still matters; the headline number is just about the process, not the work.

{% /work %}
