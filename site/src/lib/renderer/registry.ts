import type { Component } from 'svelte';
import Hint from '$lib/components/Hint.svelte';
import CallToAction from '$lib/components/CallToAction.svelte';
import Feature from '$lib/components/Feature.svelte';
import Grid from '$lib/components/Grid.svelte';
import Steps from '$lib/components/Steps.svelte';
import Tabs from '$lib/components/Tabs.svelte';
import Editor from '$lib/components/Editor.svelte';
import Pricing from '$lib/components/Pricing.svelte';
import PageSection from '$lib/components/PageSection.svelte';
import NavComponent from '$lib/components/Nav.svelte';

/** Maps typeof attribute values to Svelte components */
export const registry: Record<string, Component<any>> = {
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
	'PageSection': PageSection,
	'Nav': NavComponent,
	'NavGroup': NavComponent,
	'NavItem': NavComponent,
};

export function getComponent(typeName: string): Component<any> | undefined {
	return registry[typeName];
}
