import type { ElementOverrides } from '@refract-md/svelte';
import Table from './elements/Table.svelte';
import Blockquote from './elements/Blockquote.svelte';

/** Maps HTML element names to Lumina theme override components */
export const elements: ElementOverrides = {
	'table': Table,
	'blockquote': Blockquote,
};
