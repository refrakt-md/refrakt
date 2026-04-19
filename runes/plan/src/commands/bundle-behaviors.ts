import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Bundle plan-behaviors.ts into a single IIFE string for the browser.
 * Returns the bundled JavaScript as a string.
 *
 * esbuild is lazy-imported so that `plan status`, `plan next`, and other
 * non-build commands don't pay the cost of loading it (and can run in
 * environments where esbuild isn't installed).
 */
export async function bundleBehaviors(): Promise<string> {
	let build: typeof import('esbuild').build;
	try {
		({ build } = await import('esbuild'));
	} catch (err: any) {
		throw new Error(
			`esbuild is required to run this command but is not installed.\n` +
			`Install it with: npm install --save-dev esbuild\n` +
			`Original error: ${err?.message ?? err}`,
		);
	}

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
