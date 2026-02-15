import { createTransform } from '@refrakt-md/transform';
import { luminaConfig } from './config.js';

// Re-export everything from @refrakt-md/transform for backward compat
export { createTransform } from '@refrakt-md/transform';
export type { ThemeConfig, RuneConfig, SerializedTag, RendererNode } from '@refrakt-md/transform';

/** Lumina identity transform — adds BEM classes, consumes meta tags, enhances structure */
export const identityTransform = createTransform(luminaConfig);
