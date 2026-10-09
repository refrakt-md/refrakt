{% bug id="BUG-035" status="confirmed" severity="major" source="SPEC-109" tags="create-refrakt,scaffolding,nav,dx" %}

# Five `create-refrakt` starters link a nav item to a page that does not exist

Found by {% ref "WORK-634" /%} (#695), which scaffolds a project in its tests.

The starters ship `content/docs/getting-started.md`, but five of the six `_layout.md` files
list the nav item as `getting-started` instead of `docs/getting-started`:

- `template` (SvelteKit)
- `template-astro`
- `template-eleventy`
- `template-next`
- `template-nuxt`

`template-html` is correct. The unresolved slug produces a nav error on every page, so the first
thing a new user sees in a freshly scaffolded project is an error they did not cause.

## Steps to Reproduce

1. `npx create-refrakt my-site` with the default (SvelteKit) template.
2. Start the dev server and open any page.

## Expected

The nav resolves, and a fresh scaffold builds with no errors or warnings.

## Actual

`getting-started` resolves to no page, and every page reports it.

## Fix

Change the nav item to `docs/getting-started` in the five templates. Also add a scaffold test that
builds each template and asserts zero errors, so a template-only drift like this one is caught.

{% /bug %}
