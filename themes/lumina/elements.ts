import type { ElementOverrides } from '@refrakt-md/svelte';
import Table from './elements/Table.svelte';
import Blockquote from './elements/Blockquote.svelte';
import Pre from './elements/Pre.svelte';

/** Maps HTML element names to Lumina theme override components */
export const elements: ElementOverrides = {
	'table': Table,
	'blockquote': Blockquote,
	'pre': Pre,
};
