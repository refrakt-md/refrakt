{% bug id="BUG-052" status="in-progress" severity="minor" source="" tags="" milestone="v0.49.0" %}

# create-refrakt --help shows a --framework value that errors

## Steps to Reproduce
1. Run `npx create-refrakt --help`.
2. Try the listed example `npx create-refrakt my-docs --framework svelte --template docs-starter`.

## Expected
Every example in `--help` runs.

## Actual
`--framework` is an alias of `--target`, whose values are `sveltekit`, `astro`, `next`, `nuxt`, `eleventy` and `html`; `svelte` is rejected. The example should read `--framework sveltekit`.

## Environment
- `create-refrakt` 0.48.x (`packages/create-refrakt/src/bin.ts`)

{% /bug %}
