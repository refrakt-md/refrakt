import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

// Helper to create a temp package directory
function createTempDir(): string {
	const dir = join(tmpdir(), `refrakt-pkg-validate-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	mkdirSync(dir, { recursive: true });
	return dir;
}

function writePkgJson(dir: string, content: Record<string, unknown>): void {
	writeFileSync(join(dir, 'package.json'), JSON.stringify(content, null, 2));
}

function writeModule(dir: string, relPath: string, content: string): void {
	const fullPath = join(dir, relPath);
	mkdirSync(join(fullPath, '..'), { recursive: true });
	writeFileSync(fullPath, content);
}

describe('package-validate', () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = createTempDir();
	});

	afterEach(() => {
		if (existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	// We test the validate logic by importing and calling the command function
	// with a capturedstdout. Since the command calls process.exit, we'll
	// test the lower-level validation instead.

	it('detects missing package.json', async () => {
		const { packageValidateCommand } = await import('../src/commands/package-validate.js');

		// Mock process.exit to avoid test runner crash
		const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called');
		});

		const logs: string[] = [];
		const logMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
			logs.push(args.join(' '));
		});

		try {
			await packageValidateCommand({ packageDir: tempDir, json: true });
		} catch {
			// Expected: process.exit
		}

		const output = logs.join('\n');
		expect(output).toContain('package.json');
		expect(output).toContain('File not found');

		exitMock.mockRestore();
		logMock.mockRestore();
	});

	it('detects invalid JSON in package.json', async () => {
		writeFileSync(join(tempDir, 'package.json'), 'not valid json{{{');

		const { packageValidateCommand } = await import('../src/commands/package-validate.js');

		const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called');
		});

		const logs: string[] = [];
		const logMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
			logs.push(args.join(' '));
		});

		try {
			await packageValidateCommand({ packageDir: tempDir, json: true });
		} catch {
			// Expected
		}

		const output = logs.join('\n');
		expect(output).toContain('Invalid JSON');

		exitMock.mockRestore();
		logMock.mockRestore();
	});

	it('detects when no RunePackage export is found', async () => {
		writePkgJson(tempDir, {
			name: '@test/my-pkg',
			version: '1.0.0',
			main: 'src/index.js',
		});

		// Write a module that doesn't export a RunePackage
		writeModule(tempDir, 'src/index.js', 'export const notAPkg = { foo: "bar" };');

		const { packageValidateCommand } = await import('../src/commands/package-validate.js');

		const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called');
		});

		const logs: string[] = [];
		const logMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
			logs.push(args.join(' '));
		});

		try {
			await packageValidateCommand({ packageDir: tempDir, json: true });
		} catch {
			// Expected
		}

		const output = logs.join('\n');
		expect(output).toContain('RunePackage');

		exitMock.mockRestore();
		logMock.mockRestore();
	});

	it('validates a correct package successfully', async () => {
		writePkgJson(tempDir, {
			name: '@test/valid-pkg',
			version: '1.0.0',
			main: 'src/index.js',
		});

		writeModule(tempDir, 'src/index.js', `
			export const myPkg = {
				name: 'valid-pkg',
				version: '1.0.0',
				runes: {
					'widget': {
						transform: { attributes: { name: { type: String } } },
						description: 'A widget rune',
						fixture: '{% widget name="test" %}content{% /widget %}',
					},
				},
			};
		`);

		const { packageValidateCommand } = await import('../src/commands/package-validate.js');

		const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called');
		});

		const logs: string[] = [];
		const logMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
			logs.push(args.join(' '));
		});

		// Should not throw (not call process.exit)
		let didExit = false;
		try {
			await packageValidateCommand({ packageDir: tempDir });
		} catch {
			didExit = true;
		}

		const output = logs.join('\n');
		// Valid package — should print OK
		expect(output).toContain('OK');

		exitMock.mockRestore();
		logMock.mockRestore();
	});

	it('detects missing transform on a rune entry', async () => {
		writePkgJson(tempDir, {
			name: '@test/bad-rune',
			version: '1.0.0',
			main: 'src/index.js',
		});

		// Write a module that exports a RunePackage where 'broken' rune has no transform
		writeModule(tempDir, 'src/index.js', `
			export default {
				name: 'bad-rune',
				version: '1.0.0',
				runes: {
					'broken': {
						description: 'Missing transform',
					},
				},
			};
		`);

		const { packageValidateCommand } = await import('../src/commands/package-validate.js');

		const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {
			// Don't throw — let the function continue to call console.log
		}) as any);

		const logs: string[] = [];
		const logMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
			logs.push(args.join(' '));
		});

		await packageValidateCommand({ packageDir: tempDir, json: true });

		const output = logs.join('\n');
		const result = JSON.parse(output);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e: any) => e.path.includes('transform'))).toBe(true);

		exitMock.mockRestore();
		logMock.mockRestore();
	});

	it('warns about empty fixture strings', async () => {
		writePkgJson(tempDir, {
			name: '@test/empty-fixture',
			version: '1.0.0',
			main: 'src/index.js',
		});

		writeModule(tempDir, 'src/index.js', `
			export const myPkg = {
				name: 'empty-fixture',
				version: '1.0.0',
				runes: {
					'widget': {
						transform: { attributes: {} },
						fixture: '   ',
						description: 'A widget',
					},
				},
			};
		`);

		const { packageValidateCommand } = await import('../src/commands/package-validate.js');

		const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called');
		});

		const logs: string[] = [];
		const logMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
			logs.push(args.join(' '));
		});

		try {
			await packageValidateCommand({ packageDir: tempDir, json: true });
		} catch {
			// Expected
		}

		const output = logs.join('\n');
		const result = JSON.parse(output);
		// Empty fixture is an error (not a warning)
		expect(result.errors.some((e: any) => e.path.includes('fixture'))).toBe(true);

		exitMock.mockRestore();
		logMock.mockRestore();
	});

	it('validates theme config entries', async () => {
		writePkgJson(tempDir, {
			name: '@test/theme-config',
			version: '1.0.0',
			main: 'src/index.js',
		});

		writeModule(tempDir, 'src/index.js', `
			export const myPkg = {
				name: 'theme-config',
				version: '1.0.0',
				runes: {
					'widget': {
						transform: { attributes: {} },
						description: 'A widget',
					},
				},
				theme: {
					runes: {
						Widget: { block: '' },
					},
				},
			};
		`);

		const { packageValidateCommand } = await import('../src/commands/package-validate.js');

		const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called');
		});

		const logs: string[] = [];
		const logMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
			logs.push(args.join(' '));
		});

		try {
			await packageValidateCommand({ packageDir: tempDir, json: true });
		} catch {
			// Expected
		}

		const output = logs.join('\n');
		const result = JSON.parse(output);
		expect(result.errors.some((e: any) => e.path.includes('block'))).toBe(true);

		exitMock.mockRestore();
		logMock.mockRestore();
	});

	describe('cli-plugin lint', () => {
		function setupPluginPackage(pluginSource: string): void {
			writePkgJson(tempDir, {
				name: '@test/plugin-pkg',
				version: '1.0.0',
				main: 'src/index.js',
				exports: {
					'.': './src/index.js',
					'./cli-plugin': './src/cli-plugin.js',
				},
			});
			writeModule(tempDir, 'src/index.js', `
				export default {
					name: 'plugin-pkg',
					version: '1.0.0',
					runes: {
						'widget': {
							transform: { attributes: {} },
							description: 'A widget',
						},
					},
				};
			`);
			writeModule(tempDir, 'src/cli-plugin.js', pluginSource);
		}

		async function runValidate(): Promise<{ output: string; exited: boolean }> {
			const { packageValidateCommand } = await import('../src/commands/package-validate.js');
			const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => {
				throw new Error('process.exit called');
			});
			const logs: string[] = [];
			const logMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
				logs.push(args.join(' '));
			});
			let exited = false;
			try {
				await packageValidateCommand({ packageDir: tempDir });
			} catch {
				exited = true;
			}
			exitMock.mockRestore();
			logMock.mockRestore();
			return { output: logs.join('\n'), exited };
		}

		it('skips lint when the package has no cli-plugin export', async () => {
			writePkgJson(tempDir, {
				name: '@test/no-plugin',
				version: '1.0.0',
				main: 'src/index.js',
			});
			writeModule(tempDir, 'src/index.js', `
				export default {
					name: 'no-plugin',
					version: '1.0.0',
					runes: { widget: { transform: { attributes: {} } } },
				};
			`);
			const { output } = await runValidate();
			// Should pass with no cli-plugin warnings/errors.
			expect(output).not.toContain('cli-plugin');
		});

		it('warns when commands are missing inputSchema (recommended for MCP)', async () => {
			setupPluginPackage(`
				export default {
					namespace: 'tp',
					commands: [
						{
							name: 'hello',
							description: 'Say hi',
							handler: () => {},
						},
					],
				};
			`);
			const { output, exited } = await runValidate();
			expect(exited).toBe(false);
			expect(output).toContain('Command "hello" has no inputSchema');
		});

		it('errors when a cli-plugin export is missing required fields', async () => {
			setupPluginPackage(`
				export default {
					// missing namespace
					commands: [],
				};
			`);
			const { output, exited } = await runValidate();
			expect(exited).toBe(true);
			expect(output).toContain('Could not find a valid CliPlugin export');
		});

		it('errors when a command is missing handler', async () => {
			setupPluginPackage(`
				export default {
					namespace: 'tp',
					commands: [
						{ name: 'broken', description: 'no handler' },
					],
				};
			`);
			const { output, exited } = await runValidate();
			expect(exited).toBe(true);
			expect(output).toContain('handler');
		});

		it('errors when inputSchema is not an object', async () => {
			setupPluginPackage(`
				export default {
					namespace: 'tp',
					commands: [
						{
							name: 'bad',
							description: 'bad schema',
							handler: () => {},
							inputSchema: 'not a schema',
						},
					],
				};
			`);
			const { output, exited } = await runValidate();
			expect(exited).toBe(true);
			expect(output).toContain('inputSchema');
			expect(output).toContain('JSON Schema object');
		});

		it('warns when inputSchema is present but mcpHandler is missing', async () => {
			setupPluginPackage(`
				export default {
					namespace: 'tp',
					commands: [
						{
							name: 'partial',
							description: 'has schema but no handler',
							handler: () => {},
							inputSchema: { type: 'object' },
						},
					],
				};
			`);
			const { output, exited } = await runValidate();
			expect(exited).toBe(false);
			expect(output).toContain('mcpHandler');
			expect(output).toContain('argv-shimming');
		});

		it('passes cleanly when a command declares everything', async () => {
			setupPluginPackage(`
				export default {
					namespace: 'tp',
					commands: [
						{
							name: 'good',
							description: 'fully wired',
							handler: () => {},
							inputSchema: { type: 'object', properties: { x: { type: 'string' } } },
							outputSchema: { type: 'object' },
							mcpHandler: async () => ({}),
						},
					],
				};
			`);
			const { output, exited } = await runValidate();
			expect(exited).toBe(false);
			// No inputSchema/mcpHandler warnings should appear for this command.
			expect(output).not.toContain('Command "good" has no inputSchema');
			expect(output).not.toContain('declares inputSchema but no mcpHandler');
		});
	});

	it('JSON output mode produces valid JSON', async () => {
		writePkgJson(tempDir, {
			name: '@test/json-output',
			version: '1.0.0',
			main: 'src/index.js',
		});

		writeModule(tempDir, 'src/index.js', `
			export const myPkg = {
				name: 'json-output',
				version: '1.0.0',
				runes: {
					'widget': {
						transform: { attributes: {} },
						description: 'A widget',
						fixture: '{% widget %}content{% /widget %}',
					},
				},
			};
		`);

		const { packageValidateCommand } = await import('../src/commands/package-validate.js');

		const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called');
		});

		const logs: string[] = [];
		const logMock = vi.spyOn(console, 'log').mockImplementation((...args) => {
			logs.push(args.join(' '));
		});

		try {
			await packageValidateCommand({ packageDir: tempDir, json: true });
		} catch {
			// May or may not exit
		}

		const output = logs.join('\n');
		const result = JSON.parse(output);
		expect(result).toHaveProperty('valid');
		expect(result).toHaveProperty('packageName');
		expect(result).toHaveProperty('errors');
		expect(result).toHaveProperty('warnings');

		exitMock.mockRestore();
		logMock.mockRestore();
	});
});
