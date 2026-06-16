import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Generate the gallery artifacts (rune gallery + layout fixtures) the tests
 * photograph. Invokes the built CLI's `gallery` command against the repo's
 * `main` site, writing to `.artifacts/` (gitignored). Requires the CLI to be
 * built (`npm run build`).
 *
 * One run per theme. Lumina is the shipped baseline; `@refrakt-md/proof-skin`
 * is the WORK-440 proof skin — a structurally-identical, visually-divergent
 * skin over the same `@refrakt-md/skeleton`. Photographing both lets the
 * harness prove the skeleton is theme-agnostic: identical structure, the only
 * pixel differences are the skin's. Each run writes `<theme>.{mode}.html` etc.
 */
const THEMES = ['@refrakt-md/lumina', '@refrakt-md/proof-skin'];

export default function globalSetup(): void {
	const here = dirname(fileURLToPath(import.meta.url));
	const repoRoot = resolve(here, '..', '..');
	const cli = resolve(repoRoot, 'packages/cli/dist/bin.js');
	const outDir = resolve(here, '.artifacts');
	for (const theme of THEMES) {
		execFileSync('node', [cli, 'gallery', '--theme', theme, '--site', 'main', '--out', outDir], {
			cwd: repoRoot,
			stdio: 'inherit',
		});
	}
}
