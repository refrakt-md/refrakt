import type { ElementOverrides } from '@refrakt-md/svelte';
import Table from './elements/Table.svelte';
import Pre from './elements/Pre.svelte';

/** Base element overrides — functional enhancements for HTML elements */
export const elements: ElementOverrides = {
	'table': Table,
	'pre': Pre,
};
