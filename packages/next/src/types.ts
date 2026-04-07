import type { AdapterTheme } from '@refrakt-md/transform';

/**
 * Theme definition for the Next.js adapter (HTML rendering mode).
 *
 * Alias for the shared `AdapterTheme` — used with `RefraktContent` which
 * renders via identity transform + renderToHtml.
 *
 * For component override mode (ADR-008), use `ReactTheme` from
 * `@refrakt-md/react` with the `Renderer` component instead.
 */
export type NextTheme = AdapterTheme;
