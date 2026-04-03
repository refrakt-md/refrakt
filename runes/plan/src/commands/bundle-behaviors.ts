import { build } from 'esbuild';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Bundle plan-behaviors.ts into a single IIFE string for the browser.
 * Returns the bundled JavaScript as a string.
 */
export async function bundleBehaviors(): Promise<string> {
	// In dev (ts-node / tsx), use the .ts source; in built dist, use the .js output
	const entryExt = __dirname.includes('/dist/') ? '.js' : '.ts';
	const entryPoint = path.join(__dirname, `plan-behaviors${entryExt}`);

	const result = await build({
		entryPoints: [entryPoint],
		bundle: true,
		format: 'iife',
		minify: true,
		write: false,
		platform: 'browser',
		target: ['es2020'],
	});

	return result.outputFiles[0].text;
}
