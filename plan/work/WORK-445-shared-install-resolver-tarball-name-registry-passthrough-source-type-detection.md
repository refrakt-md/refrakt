{% work id="WORK-445" status="done" priority="high" complexity="moderate" source="SPEC-110" tags="cli,install,resolver,tarball,registry" milestone="v0.25.0" %}

# Shared install resolver: tarball name, registry passthrough, source-type detection

`theme install` resolves only directories and registry names and dead-ends on `.tgz`
tarballs (`pluginName = ''`). {% ref "SPEC-110" /%} §1–§2,§4 factor *source resolution* into
one helper that theme, template, and preset-pack install all call — so the tarball/registry
improvements land once.

## Acceptance Criteria
- [x] A shared resolver detects source type (local directory | `.tgz` tarball | registry specifier) and returns a concrete package name + version
- [x] Tarball resolution reads `package/package.json` from inside the archive up front; the `.tgz` branch no longer dead-ends to "install from the unzipped directory"
- [x] `--registry <url>` is passed through to the detected package manager; `.npmrc`/scope config is honoured; refrakt stores no credentials
- [x] `theme install` is refactored onto the shared resolver with no regression for the directory/registry-name cases
- [x] Unit tests cover each source type, including a malformed tarball

## Approach
Extract resolution from `packages/cli/src/commands/theme.ts` into a reusable helper. Use a
minimal tar reader (or an existing dependency) for the `.tgz` case. Package-manager detection
stays in `config-file.ts`. The resolver returns `{ name, version, source }`; the apply-mode is
a separate concern (the `kind`-keyed apply work item).

## References
- {% ref "SPEC-110" /%} §1, §2, §4
- `packages/cli/src/commands/theme.ts`, `packages/cli/src/config-file.ts`

## Resolution

Completed: 2026-06-23

Branch: `claude/v0.25.0-impl`

### What was done
- `packages/cli/src/commands/install.ts` — `resolveSource()` (directory | `.tgz` | registry → `{name, version, installSource, sourceType}`), `readPackageJsonFromTarball()` (dependency-free gzip+ustar reader of `package/package.json`), `parsePackageName()`, `buildInstallCommand()` with `--registry` passthrough.
- `theme.ts` `themeInstallCommand` refactored onto the resolver; the `.tgz` dead-end is gone.
- `install.test.ts` covers directory, tarball (round-trip), registry, and a malformed/empty tarball.

### Notes
- Hand-rolled the tar reader (npm tarballs are a flat `package/` ustar tree) to keep the published CLI free of a tar runtime dep. Registry/scoped auth stays the package manager's job via `.npmrc`.

{% /work %}
