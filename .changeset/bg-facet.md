---
"@refrakt-md/transform": patch
---

Migrate the background axis to a facet (SPEC-124, WORK-520).

The ~200-line step-1f background block moves into
`packages/transform/src/facets/bg.ts`: preset resolution with one level of
`extends`, token-driven gradients, image/video bases, the flat overlay wash,
the legibility scrim, and the SPEC-104 sandbox-guest relocation.

This is the first facet that builds its own element subtree, so it is the first
real use of `FacetResult.layers` — declared since WORK-517 and unexercised
until now. The channel held: the engine's hand-written bg-layer splice is
replaced by a generic `before-content` insertion that any facet can use.

It also required one new channel. Relocation turned out to be two halves:
`layers` puts the new subtree in, and **`FacetResult.absorbs`** takes the
original out. The bg sandbox guest is moved from the host's children into the
background layer, and without an explicit way to say so it would render twice.
Matched by node identity.

`bg` declares `after: ['cover', 'tint']`, replacing two more reads of engine
internals: cover's scrim reroute and tint's colour-scheme claim now arrive
through `ctx.axis()`. With both tint and bg publishing their scheme claim as
facet state, the `color-scheme` seed is gone entirely.

Internal only: no public API changes, and no change to rendered output — the
630 pre-existing transform tests pass unmodified, including the bg-gradient,
bg-overlay-scrim and bg-guest suites.

One pre-existing quirk is preserved rather than fixed, and is now pinned by a
test that documents it: a gradient stop with out-of-range alpha
(`primary/900`) falls back to interpolating the whole stop, emitting
`var(--rf-color-primary/900)` — not a valid custom-property name. Fixing it
would be a behaviour change and belongs in its own item.

`engine.ts` is down to 1549 lines from 2223 before the facet work began.
