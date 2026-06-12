import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Generate the gallery artifacts (rune gallery + layout fixtures) the tests
 * photograph. Invokes the built CLI's `gallery` command against the repo's
 * `main` site, writing to `.artifacts/` (gitignored). Requires the CLI to be
 * built (`npm run build`).
 */
export default function globalSetup(): void {
	const here = dirname(fileURLToPath(import.meta.url));
	const repoRoot = resolve(here, '..', '..');
	const cli = resolve(repoRoot, 'packages/cli/dist/bin.js');
	const outDir = resolve(here, '.artifacts');
	execFileSync('node', [cli, 'gallery', '--site', 'main', '--out', outDir], {
		cwd: repoRoot,
		stdio: 'inherit',
	});
}
