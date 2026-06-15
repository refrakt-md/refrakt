{% spec id="SPEC-110" status="draft" tags="distribution,cli,install,registry,packaging" %}

# Theme and template install robustness

`refrakt theme install` works for the common case — a local directory or a public-registry
package name — but its edges are stubbed exactly where distributed themes and templates land.
It cannot read a package name from a `.tgz` tarball (it installs the file, then gives up and
tells the user to install from the unzipped directory instead). It assumes the default public
registry. It refuses any project that declares more than one site. And there is no parallel
install surface for the site templates introduced in {% ref "SPEC-109" /%}, even though they
travel through the same directory/tarball/registry shapes.

These are the unglamorous mechanics that decide whether installing a theme or template from
*anywhere other than the public npm registry* is smooth or a dead end. This spec hardens the
shared install surface so a theme or template can be installed from a directory, a tarball, or
an arbitrary registry, into single- or multi-site projects, with consistent name resolution and
post-install validation.

This is packaging infrastructure only. It is explicitly **not** a licensing, entitlement, or
access-control mechanism (see Non-Goals).

## Problem evidence

Measured against `packages/cli/src/commands/theme.ts`:

- **Tarballs are a dead end.** When `source` ends in `.tgz`, the command runs the install but
  then cannot determine the package name (`pluginName = ''`), prints an error, and instructs the
  user to "install from the unzipped directory instead." A `.tgz` is the natural shape for a
  theme/template delivered outside a registry, so the most portable artifact is the least
  supported one.
- **Single registry assumed.** Install shells out to the detected package manager's default
  install command against the default registry. There is no path for installing from a different
  or private registry, even though the package-manager config (`.npmrc` and friends) already
  expresses this if the command cooperates.
- **Multi-site projects are rejected.** When `refrakt.config.json` declares more than one site,
  `theme install` errors out ("cannot pick a target automatically") and asks the user to edit the
  config by hand. There is no `--site` selector to disambiguate.
- **No templates install path.** {% ref "SPEC-109" /%} site templates resolve from the same
  directory/tarball/registry shapes but are **scaffold-copied**, not added as a dependency. There
  is no command surface that shares the resolution logic while applying copy (not dependency)
  semantics.
- **Thin post-install validation and no listing.** `theme install` does a best-effort exports
  check and `theme info` reports the current theme, but there is no `theme list`, and validation
  does not cover the template manifest shape.

## Design

### 1. Tarball name resolution

Read the package name from the tarball before (or instead of) relying on post-install discovery.
A `.tgz` is a gzipped tar whose `package/package.json` carries `name` and `version`; parse it
directly so tarball installs are first-class:

- Extract and read `package/package.json` from the archive to obtain `name`/`version` up front
  (a minimal tar reader, or a small dependency already in the tree).
- With the name known before install, the existing config-update and validation steps apply
  unchanged — the `.tgz` branch stops being special.
- Preserve the directory and registry-name branches as they are; only the tarball gap closes.

### 2. Registry source support

Allow installing from registries other than the default public one without bespoke auth handling
in refrakt:

- Pass through to the package manager so existing `.npmrc`/registry/scope configuration is
  honoured (scoped registries, auth tokens) — refrakt composes the install command; the package
  manager owns credentials.
- Support an explicit `--registry <url>` passthrough on install for one-off sources.
- Document that private/alternate registry auth is configured the standard package-manager way;
  refrakt neither stores nor brokers credentials.

### 3. Multi-site targeting

Replace the hard error on multi-site configs with a selector:

- `--site <name>` chooses which site's `theme` (or template) the command updates.
- When a project declares exactly one site, the target is inferred as today.
- When multiple sites exist and `--site` is absent, list the available site names and exit with a
  clear message (the current behaviour, minus the dead end — now resolvable with a flag rather
  than hand-editing).

This reuses the existing `readThemeFromConfig`/`writeThemeIntoConfig` helpers, extended to accept
an explicit site key instead of only inferring the single-site case.

### 4. Shared resolution, two apply-semantics

Themes and templates share *source resolution* (directory | tarball | registry name → a concrete
package with a known name) but differ in *what happens next*:

- **Theme** → add as a live dependency and point the site's `theme` field at it (today's path,
  hardened by §1–§3).
- **Template** ({% ref "SPEC-109" /%}) → resolve the same way, then **scaffold-copy** its content
  and merge its config fragment, pinning its recommended theme + required plugins as dependencies.

Factor the resolution step (source-type detection, name/version discovery, package-manager
detection) into a shared helper both the theme command and the template scaffold call, so the
tarball/registry/multi-site improvements land once and benefit both.

### 5. Validation and listing

- Extend post-install validation to cover both artifact kinds: a theme's `./svelte`/`./transform`
  exports (today's check) and a template's `template.json` manifest (required fields,
  `requiredPlugins` resolvable, `recommendedTheme` shape).
- Add `theme list` (installed themes discoverable from `node_modules` + the active one) to round
  out `theme info`. A parallel `template` listing is in scope as the template command surface lands.

## Non-Goals

- **No licensing, entitlement, or access control.** This spec does not add license keys, paywalls,
  download gating, or any access-control mechanism to the install path. Such concerns, if they
  ever exist, belong to an external distribution layer and must not live in this repository —
  putting an access-control mechanism in MIT-licensed install code would be both ineffective and
  a leak of intent. The install surface treats every resolvable source identically.
- **No bundled registry or catalog.** refrakt does not host, index, or curate themes/templates.
  Sources are plain directories, tarballs, or registry packages.
- **No credential storage.** Authentication for private/alternate registries is delegated entirely
  to the package manager's standard configuration.

## Acceptance Criteria

- [ ] `refrakt theme install <file>.tgz` resolves the package name/version from the tarball's `package/package.json` and completes the install + config update without falling back to "install from the unzipped directory."
- [ ] Installing from an alternate/private registry works via package-manager `.npmrc`/scope configuration and an explicit `--registry <url>` passthrough; refrakt stores no credentials.
- [ ] `--site <name>` targets a specific site in multi-site projects; single-site projects infer the target as today; multi-site without `--site` lists site names and exits cleanly rather than erroring as a dead end.
- [ ] Source resolution (directory | tarball | registry name → known package) is factored into a shared helper used by both theme install and the {% ref "SPEC-109" /%} template scaffold, which apply dependency vs. scaffold-copy semantics respectively.
- [ ] Post-install validation covers both a theme's runtime exports and a template's `template.json` manifest; `theme list` reports installed and active themes.
- [ ] The Non-Goals (no licensing/entitlement/gating, no bundled catalog, no credential storage) are documented so the install path stays a neutral packaging mechanism.

## References

- Current install command: `packages/cli/src/commands/theme.ts` (`themeInstallCommand`,
  `themeInfoCommand`, `readThemeFromConfig`, `writeThemeIntoConfig`); CLI wiring in
  `packages/cli/src/bin.ts` (`theme` subcommand, `runTheme`).
- Config load/write + package-manager detection: `packages/cli/src/config-file.ts`
  (`loadRefraktConfigFile`, `writeRefraktConfigFile`, `detectPackageManager`).
- Site/theme config shapes: `packages/types/src/theme.ts` (`SiteThemeConfig`, `getThemePackage`),
  `RefraktConfig` site normalization.
- Site templates (the second consumer of the shared resolver): {% ref "SPEC-109" /%}.
- Framework-agnostic theme packages (export contract validated post-install): ADR-009.

{% /spec %}
