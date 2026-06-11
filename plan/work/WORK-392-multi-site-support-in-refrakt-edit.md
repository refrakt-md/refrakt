{% work id="WORK-392" status="ready" priority="high" complexity="moderate" tags="editor,cli,multi-site,config" %}

# Multi-site support in refrakt edit

`refrakt edit` cannot launch in a multi-site project: `EditOptions` is just
`port`/`contentDir`/`devServer`/`noOpen`, and `resolveSite()` throws when
multiple sites are declared, telling the user to pass `--content-dir` —
which bypasses config resolution entirely, losing plugins, tints, icons,
and route rules. Refrakt's own repo (sites `main` + `plan`) hits this.
Add a `--site` flag and an in-editor site switcher so the editor works
first-class against multi-site configs.

## Acceptance Criteria
- [ ] `refrakt edit --site <name>` selects a site from `sites` in
  `refrakt.config.json`; the chosen site's contentDir, theme, plugins,
  tints, backgrounds, icons, and route rules all apply.
- [ ] With multiple sites and no `--site`, the CLI lists available site
  names in the error (or picks interactively when the terminal is a TTY)
  instead of pointing at `--content-dir`.
- [ ] The editor header shows the active site and offers a switcher when
  more than one site is configured; switching swaps content tree, theme
  CSS, plugins, and cached pipeline data without a manual restart.
- [ ] Single-site and `--content-dir` flows behave exactly as today (no
  regression).
- [ ] Route-rule persistence (`PUT /api/route-rules`) writes to the
  correct site's section in a multi-site config.

## Approach
- CLI: add `site?: string` to `EditOptions`
  (`packages/cli/src/commands/edit.ts`) and pass it through to
  `resolveSite(config, site)`; improve the multiple-sites error path.
- Server: `startEditor` currently receives one resolved site's worth of
  options. Either (a) restart-free switching — accept a map of resolved
  site configs and rebuild contentDir-scoped state (tree, watcher,
  pipeline cache, theme CSS) on switch, or (b) v1: switcher triggers a
  server-side re-init with the new site. (b) is acceptable if (a) balloons.
- Client: active-site indicator + switcher in `HeaderBar.svelte`; site
  name in `/api/config` payload.
- Tests: CLI resolution paths (single, multi + flag, multi without flag);
  route-rule write targeting the right site key.

## References
- `packages/cli/src/commands/edit.ts` (lines 30–41: the throwing path),
  `packages/editor/src/server.ts` (`EditorOptions`),
  `packages/types/src/theme.ts` (`sites` map).
- {% ref "SPEC-097" /%} — config studio assumes per-site selection exists.

{% /work %}
