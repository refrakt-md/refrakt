# @refrakt-md/skeleton

The structural cascade layer and the layer-order contract every refrakt theme
builds on (SPEC-094 §3 — the skeleton/skin split).

```css
@import '@refrakt-md/skeleton'; /* must load first */
```

Importing this entry first emits the one line the whole split rests on:

```css
@layer skeleton, skin;
```

Once the order is declared, layer **contents** may load in any source order or
from any package, and a theme's `@layer skin` still wins where it overlaps
`@layer skeleton` — with ordinary single-class / attribute selectors and **no
`!important`**.

## The two layers

- **`@layer skeleton`** (this package) — framework-agnostic *structure*: the
  rules a rune breaks without (`display`/`grid`/`flex`/`position`/`overflow`, gap
  & margin resets, the media↔content split geometry, the stretched-link
  mechanism). References tokens by name; never sets their values, colour, border,
  radius, shadow, or font.
- **`@layer skin`** (a theme, e.g. `@refrakt-md/lumina`) — aesthetics: colour,
  background, border presence/style, radius, shadow, type, and the token
  *values*.

## The token contract

The `./contract` entry re-exports the `TokenContract` type (the token **names** a
skin must populate) plus the layer-name constants. Values live in the skin; a
breaking structural change bumps *this* package's version, not a skin's.

```ts
import type { TokenContract } from '@refrakt-md/skeleton/contract';
import { LAYER_ORDER_DECLARATION } from '@refrakt-md/skeleton/contract';
```
