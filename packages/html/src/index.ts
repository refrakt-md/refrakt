// Theme type
export type { HtmlTheme } from './theme.js';

// Rendering
export { renderPage } from './render.js';
export type { RenderPageInput } from './render.js';

// Full page shell
export { renderFullPage } from './page-shell.js';
export type { PageShellOptions } from './page-shell.js';

// Tree transforms (useful for custom pipelines)
export { applyHtmlTransforms } from './tree-transforms.js';

// Site-level token-overrides CSS (SPEC-048 + SPEC-056). Re-exported from
// `@refrakt-md/transform/node` so consumers can produce the override CSS
// string and inline it via `renderFullPage`'s `headExtra` option without
// reaching across packages.
export { composeSiteTokensCss } from '@refrakt-md/transform/node';

// Tree-shaken per-rune CSS — consumers call `computeUsedCssBlocks` after
// loading the site and pass the result through `buildUsedCssImports` to
// produce a stylesheets array for `renderFullPage`'s `stylesheets` option.
export { computeUsedCssBlocks, buildUsedCssImports } from '@refrakt-md/transform/node';
