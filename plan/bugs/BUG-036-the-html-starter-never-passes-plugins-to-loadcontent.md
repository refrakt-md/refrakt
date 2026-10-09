{% bug id="BUG-036" status="confirmed" severity="major" source="SPEC-109" tags="create-refrakt,html,plugins,pipeline" %}

# The HTML starter never passes `plugins` to `loadContent`

Found by {% ref "WORK-634" /%} (#695).

`packages/create-refrakt/template-html/build.ts` calls `loadContent` without the `plugins`
option. Its own comment (around line 127) says plugins should be passed through, matching the
option shape `createRefraktLoader` uses for the Vite-based adapters. As a result:

- plugin pipeline hooks (`register`, `aggregate`, `postProcess`) do not run;
- declarative `registers` (SPEC-144) do not run;
- cross-page features that depend on them (entity registry, auto-links, `relationships`) are empty.

These fail silently, so a project scaffolded with the HTML template looks fine until a
cross-page feature produces nothing.

## Steps to Reproduce

1. `npx create-refrakt my-site --template html`, and add a plugin with pipeline hooks (e.g.
   `@refrakt-md/storytelling`) to `refrakt.config.json`.
2. Write two pages, one with a `{% character %}` and one with a `{% bond %}` naming it.
3. Build.

## Expected

The bond's edge is registered, the same as in the SvelteKit adapter.

## Actual

No registrations. Plugin hooks never ran.

## Fix

Load the configured plugins and pass them to `loadContent`, as the other adapters do. Cover it
with a scaffold test that asserts a plugin hook ran.

{% /bug %}
