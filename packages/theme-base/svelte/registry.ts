import type { ComponentRegistry } from '@refrakt-md/svelte';
import Chart from './components/Chart.svelte';
import Comparison from './components/Comparison.svelte';
import Testimonial from './components/Testimonial.svelte';
import Embed from './components/Embed.svelte';
import DesignContext from './components/DesignContext.svelte';

/** Maps typeof attribute values to base theme Svelte components.
 *
 *  Interactive runes that previously required Svelte (Diagram, Map, Nav, Sandbox)
 *  are now framework-neutral web components in @refrakt-md/behaviors, initialized
 *  via custom elements. Their identity transform postTransform hooks produce
 *  custom element tags (rf-diagram, rf-map, rf-nav, rf-sandbox) with fallback HTML.
 *
 *  Behavior-driven runes (tabs, accordion, datatable, form, reveal, preview, details)
 *  use the generic Renderer path with BEM classes from the identity transform,
 *  and interactivity from @refrakt-md/behaviors.
 *
 *  Layout runes (grid, bento, storyboard, pricing) are fully handled by
 *  identity transform + CSS attribute selectors / custom properties.
 */
export const registry: ComponentRegistry = {
	// Complex data rendering
	'Chart': Chart,
	'Comparison': Comparison,
	'ComparisonColumn': Comparison,
	'ComparisonRow': Comparison,
	// Rendering logic
	'Embed': Embed,
	'Testimonial': Testimonial,
	// Design
	'DesignContext': DesignContext,
};
