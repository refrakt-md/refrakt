import type { ComponentRegistry } from '@refrakt-md/svelte';
import Tabs from './components/Tabs.svelte';
import DataTable from './components/DataTable.svelte';
import Diagram from './components/Diagram.svelte';
import Reveal from './components/Reveal.svelte';
import Form from './components/Form.svelte';
import Nav from './components/Nav.svelte';
import Chart from './components/Chart.svelte';
import Grid from './components/Grid.svelte';
import Comparison from './components/Comparison.svelte';
import Testimonial from './components/Testimonial.svelte';
import Embed from './components/Embed.svelte';
import Bento from './components/Bento.svelte';
import CodeGroup from './components/CodeGroup.svelte';
import MapComponent from './components/Map.svelte';
import Preview from './components/Preview.svelte';
import Sandbox from './components/Sandbox.svelte';
import DesignContext from './components/DesignContext.svelte';


/** Maps typeof attribute values to base theme Svelte components.
 *  Components registered here handle interactive behavior, complex data
 *  rendering, or dynamic layouts. All other runes use the generic Renderer
 *  path with BEM classes applied by the identity transform.
 */
export const registry: ComponentRegistry = {
	// Interactive
	'CodeGroup': CodeGroup,
	'TabGroup': Tabs,
	'Tab': Tabs,
	'DataTable': DataTable,
	'Form': Form,
	'FormField': Form,
	'Reveal': Reveal,
	'RevealStep': Reveal,
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
	'Bento': Bento,
	'BentoCell': Bento,
	'Embed': Embed,
	// Rendering logic
	'Testimonial': Testimonial,
	// Map visualization
	'Map': MapComponent,
	'MapPin': MapComponent,
	// Showcase
	'Preview': Preview,
	'Sandbox': Sandbox,
	// Design
	'DesignContext': DesignContext,
};
