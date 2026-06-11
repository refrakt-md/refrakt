{% milestone name="v0.20.2" status="planning" %}

# v0.20.2 — HTML scaffold client runtime

A focused patch closing the `@refrakt-md/html` scaffold's interactivity gap: the
adapter ships the client runtime (`@refrakt-md/html/client` + `@refrakt-md/behaviors`)
but `template-html`'s build never bundles or references it, so a scaffolded static
site has inert tabs, accordion, search, and theme-toggle. This milestone makes a
scaffolded html site interactive out of the box.

## Scope

- {% ref "WORK-293" /%} — bundle a tiny client entry (`initPage()`) in
  `template-html`'s build, reference it via `renderFullPage`'s `scripts`, and ship
  the layout-chrome CSS so the controls are styled — verified in a browser
  (theme-toggle cycles; one other behaviour live). Source: {% ref "SPEC-073" /%}.

## Notes

- Carried out of v0.20.1 (where it was an unrelated backlog tail) into its own patch
  so it isn't blocked by, or muddled with, the surface-docs or registry work.

{% /milestone %}
