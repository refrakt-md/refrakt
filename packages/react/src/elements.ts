import type { ComponentType } from 'react';
import { Table } from './elements/Table.js';
import { Pre } from './elements/Pre.js';

export type ElementOverrides = Record<string, ComponentType<any>>;

/**
 * Default element overrides for the React renderer.
 *
 * - `table`: Wraps in scrollable container
 * - `pre`: Wraps code blocks in rf-codeblock structure for behaviors
 */
export const elements: ElementOverrides = {
	table: Table,
	pre: Pre,
};
