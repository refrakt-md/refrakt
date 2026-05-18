import { createTransform } from '@refrakt-md/transform';
import { luminaConfig } from './config.js';

// Re-export everything from @refrakt-md/transform for backward compat
export { createTransform } from '@refrakt-md/transform';
export type { ThemeConfig, RuneConfig, SerializedTag, RendererNode } from '@refrakt-md/transform';

/** Lumina theme configuration — rune-to-BEM-block mappings, modifier sources, structural injection */
export { luminaConfig } from './config.js';

/** Lumina design tokens — the typed {@link ThemeTokensConfig} that drives the
 *  `--rf-*` CSS custom properties. Adapters consume this when composing
 *  site-level token overrides; see `@refrakt-md/transform`'s
 *  `mergeThemeTokensConfigs` and `generateThemeStylesheet`. */
export { luminaTokens } from './tokens.js';

/** Lumina identity transform — adds BEM classes, consumes meta tags, enhances structure */
export const identityTransform = createTransform(luminaConfig);
