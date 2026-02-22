import type { ComponentRegistry } from '@refrakt-md/svelte';
import Diagram from './components/Diagram.svelte';
import Nav from './components/Nav.svelte';
import Chart from './components/Chart.svelte';
import Comparison from './components/Comparison.svelte';
import Testimonial from './components/Testimonial.svelte';
import Embed from './components/Embed.svelte';
import MapComponent from './components/Map.svelte';
import Sandbox from './components/Sandbox.svelte';
import DesignContext from './components/DesignContext.svelte';

/** Maps typeof attribute values to base theme Svelte components.
 *  Components registered here handle interactive behavior, complex data
 *  rendering, or dynamic layouts that require Svelte lifecycle or external
 *  libraries. Behavior-driven runes (tabs, accordion, datatable, form,
 *  reveal, preview, details) use the generic Renderer path with BEM classes
 *  from the identity transform, and interactivity from @refrakt-md/behaviors.
 *  Layout runes (grid, bento, storyboard, pricing) are fully handled by
 *  identity transform + CSS attribute selectors / custom properties.
 */
export const registry: ComponentRegistry = {
	// Interactive (require external libraries or Svelte context)
	'Diagram': Diagram,
	'Nav': Nav,
	'NavGroup': Nav,
	'NavItem': Nav,
	// Complex data rendering
	'Chart': Chart,
	'Comparison': Comparison,
	'ComparisonColumn': Comparison,
	'ComparisonRow': Comparison,
	// Rendering logic
	'Embed': Embed,
	'Testimonial': Testimonial,
	// Map visualization
	'Map': MapComponent,
	'MapPin': MapComponent,
	// Showcase
	'Sandbox': Sandbox,
	// Design
	'DesignContext': DesignContext,
};
