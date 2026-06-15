/**
 * `@refrakt-md/skeleton` — the structural cascade layer + the layer-order and
 * token-name contracts every refrakt theme builds on.
 *
 * The CSS half (`@refrakt-md/skeleton` → `index.css`) ships `@layer skeleton` and
 * the `@layer skeleton, skin;` order declaration. This module is the *contract*
 * half: the token names a theme must populate (re-exported from
 * `@refrakt-md/types`, so the contract has one definition) plus the layer-name
 * constants the loader and tests reference.
 *
 * The contract describes names, never values — a skin supplies the values for
 * these tokens, and a breaking structural change bumps *this* package's version
 * (not any one skin's), which is why the contract is owned here rather than in a
 * theme.
 */

export type { TokenContract } from '@refrakt-md/types';

/** The two cascade layers, in priority order (skin wins over skeleton). */
export const SKELETON_LAYER = 'skeleton';
export const SKIN_LAYER = 'skin';

/** The order declaration that must be emitted before any layer content. Importing
 *  `@refrakt-md/skeleton` (the CSS entry) emits this; the constant lets the loader
 *  and tests assert the contract without parsing the stylesheet. */
export const LAYER_ORDER_DECLARATION = `@layer ${SKELETON_LAYER}, ${SKIN_LAYER};`;
