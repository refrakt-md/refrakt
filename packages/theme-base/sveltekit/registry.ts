import type { ComponentRegistry } from '@refrakt-md/svelte';
import Diagram from './components/Diagram.svelte';
import Nav from './components/Nav.svelte';
import Chart from './components/Chart.svelte';
import Grid from './components/Grid.svelte';
import Comparison from './components/Comparison.svelte';
import Pricing from './components/Pricing.svelte';
import Testimonial from './components/Testimonial.svelte';
import Embed from './components/Embed.svelte';
import Storyboard from './components/Storyboard.svelte';
import Bento from './components/Bento.svelte';
import MapComponent from './components/Map.svelte';
import Sandbox from './components/Sandbox.svelte';
import DesignContext from './components/DesignContext.svelte';

/** Maps typeof attribute values to base theme Svelte components.
 *  Components registered here handle interactive behavior, complex data
 *  rendering, or dynamic layouts that require Svelte lifecycle or external
 *  libraries. Behavior-driven runes (tabs, accordion, datatable, form,
 *  reveal, preview, details) use the generic Renderer path with BEM classes
 *  from the identity transform, and interactivity from @refrakt-md/behaviors.
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
	// Dynamic layout
	'Grid': Grid,
	'Storyboard': Storyboard,
	'StoryboardPanel': Storyboard,
	'Bento': Bento,
	'BentoCell': Bento,
	'Embed': Embed,
	// Rendering logic
	'Pricing': Pricing,
	'Tier': Pricing,
	'FeaturedTier': Pricing,
	'Testimonial': Testimonial,
	// Map visualization
	'Map': MapComponent,
	'MapPin': MapComponent,
	// Showcase
	'Sandbox': Sandbox,
	// Design
	'DesignContext': DesignContext,
};
