---
title: Migration
description: Moving from the legacy flat-shape config to the unified nested form.
---

# Migration

Pre-v0.11.0 projects used a flat-shape `refrakt.config.json` with site fields at the top level. v0.11.0 introduced a nested form (`site` or `sites`) that supports multi-site repos and centralizes plugins/plan/site configuration.

**The flat shape continues to work indefinitely.** You don't have to migrate. The unified loader normalizes flat configs to `sites.default` internally, mirroring the top-level fields for backwards compatibility. Existing single-site projects keep building without changes.

## When to migrate

You should migrate when one of these is true:

- You want to add a second site to your repo (multi-site requires the `sites` form).
- You want to declare an explicit `plugins` array.
- You want a `plan` section alongside your site config.
- You prefer the cleaner nested shape for new projects.

## The migrate command

`refrakt config migrate` rewrites the config file in place. By default it's a dry run — it prints a diff and exits without writing.

```bash
# Preview the changes
npx refrakt config migrate

# Write the changes
npx refrakt config migrate --apply
```

The migrate command rewrites the flat shape into the singular `site` form — here's what a typical flat → nested migration looks like:

{% diff mode="split" language="json" %}
```json
{
	"contentDir": "./content",
	"theme": "@refrakt-md/lumina",
	"target": "svelte",
	"packages": ["@refrakt-md/marketing"]
}
```

```json
{
	"site": {
		"contentDir": "./content",
		"theme": "@refrakt-md/lumina",
		"target": "svelte",
		"packages": ["@refrakt-md/marketing"]
	}
}
```
{% /diff %}

JSON indent style is sniffed from the original file before re-serializing, so tab-indented configs stay tab-indented.

## Targets

`--to <shape>` selects the migration target:

| Target | Effect | Example |
|--------|--------|---------|
| `nested` *(default)* | Flat → singular `site`. | `refrakt config migrate --apply` |
| `multi-site` | Singular `site` → `sites.<name>`. Requires `--name <name>`. | `refrakt config migrate --to multi-site --name main --apply` |

## Two-step path: flat → singular → multi-site

If your config is in flat shape and you want to end up multi-site, run the command twice:

```bash
# Step 1: flat → singular
npx refrakt config migrate --apply

# Step 2: singular → multi-site
npx refrakt config migrate --to multi-site --name main --apply
```

`--to multi-site` refuses to run on flat-shape configs (it can't know what site name you'd want), which is why the two-step path is necessary.

## Auto-populating `plugins`

On flat → nested migration, `refrakt config migrate` auto-populates the top-level `plugins` field from `discoverPlugins()` if absent. This gives you a working plugin list immediately without remembering which packages contribute commands. Discovery failures are non-blocking.

## Idempotency

Running migrate on an already-migrated config is a no-op:

```
$ npx refrakt config migrate
No changes needed — refrakt.config.json is already in the requested shape.
```

Safe to re-run in CI or after partial edits.

## Conflict refusal

If your config somehow ends up with both `site` and `sites` declared, the migrate command refuses to run:

```
Error: refrakt.config.json declares both "site" and "sites". Resolve the conflict before migrating.
```

Pick one and remove the other before re-running.

## After migration

Once you've migrated, update your build entry points to use the new shape:

- **SvelteKit**: pass `site: 'default'` (or your custom name) in the `refrakt({...})` plugin options in `vite.config.ts`. Single-site projects can omit it.
- **Astro / Nuxt / Next / Eleventy**: same pattern — accept a `site` option that picks an entry from the config's `sites` map.
- **`refrakt.config.json` location**: the configPath defaults to `./refrakt.config.json` next to the build's working directory. Multi-app monorepos can pass `configPath: '../refrakt.config.json'` to point at a shared root config.

See [Sites](/docs/configuration/sites) for the full per-adapter wiring.
