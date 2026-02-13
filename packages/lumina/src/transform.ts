import { createTransform } from './lib/engine.js';
import { luminaConfig } from './config.js';

export { createTransform } from './lib/engine.js';
export type { ThemeConfig, RuneConfig, SerializedTag, RendererNode } from './lib/types.js';

/** Lumina identity transform — adds BEM classes, consumes meta tags, enhances structure */
export const identityTransform = createTransform(luminaConfig);
