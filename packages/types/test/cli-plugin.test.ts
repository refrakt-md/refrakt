import { describe, it, expectTypeOf } from 'vitest';
import type { CliPlugin, CliPluginCommand, JSONSchema7 } from '../src/cli-plugin.js';

describe('CliPluginCommand', () => {
	it('accepts the minimum legacy shape (name, description, handler)', () => {
		const minimal: CliPluginCommand = {
			name: 'hello',
			description: 'say hi',
			handler: async () => {},
		};
		expectTypeOf(minimal).toMatchTypeOf<CliPluginCommand>();
	});

	it('accepts the extended shape with input/output schemas and mcpHandler', () => {
		const extended: CliPluginCommand = {
			name: 'hello',
			description: 'say hi',
			handler: async () => {},
			inputSchema: {
				type: 'object',
				properties: { name: { type: 'string' } },
			},
			outputSchema: {
				type: 'object',
				properties: { greeting: { type: 'string' } },
			},
			mcpHandler: async (input) => ({ greeting: `hi ${(input as { name?: string }).name ?? 'there'}` }),
		};
		expectTypeOf(extended).toMatchTypeOf<CliPluginCommand>();
	});

	it('keeps the new fields optional — schemas can be partial or absent', () => {
		const partial: CliPluginCommand = {
			name: 'partial',
			description: 'only inputSchema',
			handler: () => {},
			inputSchema: { type: 'object' },
		};
		expectTypeOf(partial.outputSchema).toBeNullable();
		expectTypeOf(partial.mcpHandler).toBeNullable();
	});

	it('accepts a sync or async handler', () => {
		const sync: CliPluginCommand = { name: 's', description: 's', handler: () => {} };
		const async_: CliPluginCommand = { name: 'a', description: 'a', handler: async () => {} };
		expectTypeOf(sync).toMatchTypeOf<CliPluginCommand>();
		expectTypeOf(async_).toMatchTypeOf<CliPluginCommand>();
	});
});

describe('CliPlugin', () => {
	it('requires namespace and commands; description is optional', () => {
		const plugin: CliPlugin = {
			namespace: 'example',
			commands: [],
		};
		expectTypeOf(plugin).toMatchTypeOf<CliPlugin>();
		expectTypeOf(plugin.description).toBeNullable();
	});
});

describe('JSONSchema7 re-export', () => {
	it('is the standard JSONSchema7 shape', () => {
		const schema: JSONSchema7 = {
			type: 'object',
			properties: { foo: { type: 'string', enum: ['a', 'b'] } },
			required: ['foo'],
		};
		expectTypeOf(schema).toMatchTypeOf<JSONSchema7>();
	});
});
