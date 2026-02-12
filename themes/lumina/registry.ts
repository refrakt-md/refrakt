import type { ComponentRegistry } from '@refract-md/svelte';
import Hint from './components/Hint.svelte';
import CallToAction from './components/CallToAction.svelte';
import Feature from './components/Feature.svelte';
import Grid from './components/Grid.svelte';
import Steps from './components/Steps.svelte';
import Tabs from './components/Tabs.svelte';
import Editor from './components/Editor.svelte';
import Pricing from './components/Pricing.svelte';
import PageSection from './components/PageSection.svelte';
import NavComponent from './components/Nav.svelte';
import Details from './components/Details.svelte';
import Figure from './components/Figure.svelte';
import Accordion from './components/Accordion.svelte';
import Toc from './components/Toc.svelte';

/** Maps typeof attribute values to Lumina theme Svelte components */
export const registry: ComponentRegistry = {
	'Hint': Hint,
	'CallToAction': CallToAction,
	'Feature': Feature,
	'FeatureDefinition': Feature,
	'Grid': Grid,
	'Steps': Steps,
	'Step': Steps,
	'TabGroup': Tabs,
	'Tab': Tabs,
	'Editor': Editor,
	'Pricing': Pricing,
	'Tier': Pricing,
	'FeaturedTier': Pricing,
	'PageSection': PageSection,
	'Nav': NavComponent,
	'NavGroup': NavComponent,
	'NavItem': NavComponent,
	'Details': Details,
	'Figure': Figure,
	'Accordion': Accordion,
	'AccordionItem': Accordion,
	'TableOfContents': Toc,
};
