import type { Component } from 'vue';
import { Table } from './elements/Table.js';
import { Pre } from './elements/Pre.js';

export type ElementOverrides = Record<string, Component>;

/**
 * Default element overrides for the Vue renderer.
 *
 * - `table`: Wraps in scrollable container
 * - `pre`: Wraps code blocks in rf-codeblock structure for behaviors
 */
export const elements: ElementOverrides = {
	table: Table,
	pre: Pre,
};
