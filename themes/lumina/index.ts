import type { SvelteTheme } from '@refract-md/svelte';
import manifest from './manifest.json';
import { registry } from './registry.js';
import { elements } from './elements.js';
import DocsLayout from './layouts/DocsLayout.svelte';
import DefaultLayout from './layouts/DefaultLayout.svelte';

/** Re-export the raw manifest for server-side use (no Svelte imports) */
export { default as manifest } from './manifest.json';

/** The structured theme object consumed by ThemeShell */
export const theme: SvelteTheme = {
	manifest: manifest as any,
	layouts: { default: DefaultLayout, docs: DocsLayout },
	components: registry,
	elements,
};

// Backward-compatible named exports
export { registry };
export { default as DocsLayout } from './layouts/DocsLayout.svelte';
export { default as DefaultLayout } from './layouts/DefaultLayout.svelte';

// Individual components for advanced usage
export { default as Hint } from './components/Hint.svelte';
export { default as CallToAction } from './components/CallToAction.svelte';
export { default as Feature } from './components/Feature.svelte';
export { default as Grid } from './components/Grid.svelte';
export { default as Steps } from './components/Steps.svelte';
export { default as Tabs } from './components/Tabs.svelte';
export { default as Editor } from './components/Editor.svelte';
export { default as Pricing } from './components/Pricing.svelte';
export { default as PageSection } from './components/PageSection.svelte';
export { default as Nav } from './components/Nav.svelte';
export { default as Details } from './components/Details.svelte';
export { default as Figure } from './components/Figure.svelte';
export { default as Accordion } from './components/Accordion.svelte';
export { default as Toc } from './components/Toc.svelte';
