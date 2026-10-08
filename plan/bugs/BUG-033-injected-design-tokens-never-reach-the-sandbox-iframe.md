{% bug id="BUG-033" status="confirmed" severity="major" source="SPEC-002" tags="behaviors,sandbox,design" %}

# Injected design tokens never reach the sandbox iframe

The design plugin's `postProcess` (`plugins/design/src/pipeline.ts`) and the
editor preview's client-side stand-in
(`packages/editor/app/src/lib/preview/block-renderer.ts`) both deliver a
sandbox's design-context tokens as a **child** element:
`<meta data-field="design-tokens" content="{…}">`. The identity transform
leaves it in place (it is not a modifier), so it ships inside `<rf-sandbox>`.

The `rf-sandbox` behaviour never reads that child. It looks for the tokens on
a **host attribute**, `this.dataset.designTokens`
(`packages/behaviors/src/elements/sandbox.ts:112`), and otherwise falls back to
`RfContext.designTokens`. Nothing in the repo sets either: no transform emits
`data-design-tokens`, and no code assigns `RfContext.designTokens`. So
`this._tokens` is always `null` and the iframe never receives a token set,
whichever context the sandbox names.

Found while fixing {% ref "BUG-032" /%}. That fix makes the build pick the
right token set per `context`. This bug is what keeps that set from reaching
the page.

## Steps to Reproduce

1. On one page, write `{% design-context %}` with a `{% palette %}`.
2. On another page, write `{% sandbox %}<p>x</p>{% /sandbox %}`.
3. Build. The rendered `<rf-sandbox>` has a `<meta data-field="design-tokens">`
   child and no `data-design-tokens` attribute.
4. In the browser, the `rf-sandbox-content` message posted to the iframe
   carries `tokens: null`.

## Expected

The tokens the pipeline injects are the tokens the iframe receives.

## Actual

The iframe always receives `null`.

## Fix sketch

Choose one channel and have both sides use it. Either the behaviour reads the
`:scope > meta[data-field="design-tokens"]` child, or the producers (the design
`postProcess` and the editor preview) set `data-design-tokens` on the host. ADR-038 says a
behaviour binds on a data contract, so the attribute is probably the cleaner
choice. Either way, every sandbox on a site with a default `design-context`
starts receiving tokens at runtime, which is a visible change, so it needs its own
changeset and review.

## Environment

- `main` after {% ref "BUG-032" /%} (v0.39.0 packages)

{% /bug %}
