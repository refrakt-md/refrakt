import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { loadContent } from '../src/site.js';

/**
 * A `{% partial %}` inside a `{% collection %}` body is the documented way to
 * reuse a per-item template across collections (`/runes/collection`). It
 * replaced a documented-but-never-implemented `item-template` attribute
 * (BUG-006), so it is pinned here rather than trusted.
 *
 * The interaction is not obvious and is the reason this test exists: partials
 * are inlined at *parse* time, while a collection's per-item template is a
 * deferred body captured as source and re-parsed once per entity with `$item`
 * bound (SPEC-070). Those two could plausibly have raced — the partial could
 * have expanded after capture, leaving `$item` unresolved, or not expanded at
 * all inside a deferred body.
 */
describe('partial as a collection per-item template', () => {
	function buildSite() {
		const root = mkdtempSync(path.join(tmpdir(), 'refrakt-coll-partial-'));
		mkdirSync(path.join(root, '_partials'), { recursive: true });
		mkdirSync(path.join(root, 'blog'), { recursive: true });

		writeFileSync(
			path.join(root, '_partials', 'post-card.md'),
			`{% card href=$item.url %}\n# {% $item.data.title %}\n\nfrom-partial\n{% /card %}\n`,
		);
		writeFileSync(path.join(root, 'blog', 'first.md'), `---\ntitle: First Post\n---\n\n# First Post\n\nBody.\n`);
		writeFileSync(path.join(root, 'blog', 'second.md'), `---\ntitle: Second Post\n---\n\n# Second Post\n\nBody.\n`);
		writeFileSync(
			path.join(root, 'viapartial.md'),
			`---\ntitle: Via Partial\n---\n\n{% collection type="page" filter="url:/blog/*" %}\n{% partial file="post-card.md" /%}\n{% /collection %}\n`,
		);
		return root;
	}

	it('renders the partial once per entity, with $item bound', async () => {
		const root = buildSite();
		try {
			const site = await loadContent(root);
			const page = site.pages.find(p => p.route.filePath.includes('viapartial'));
			expect(page).toBeDefined();
			const rendered = JSON.stringify(page!.renderable);

			// The partial's own content reached the output...
			expect(rendered).toContain('from-partial');
			// ...once per collected entity, with each entity's data bound.
			expect(rendered).toContain('First Post');
			expect(rendered).toContain('Second Post');
			// And nothing was left for a later pass to resolve.
			expect(rendered).not.toMatch(/\$item/);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
