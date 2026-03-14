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
