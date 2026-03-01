export { baseConfig } from './config.js';
export { mergeThemeConfig, applyRuneExtensions } from './merge.js';
export type { ThemeConfigOverrides, RuneConfigExtension } from './merge.js';

// Layout configs
export { defaultLayout, docsLayout, blogArticleLayout } from './layouts.js';

// Re-export transform types for convenience
export type { ThemeConfig, RuneConfig, StructureEntry, LayoutConfig } from '@refrakt-md/transform';
