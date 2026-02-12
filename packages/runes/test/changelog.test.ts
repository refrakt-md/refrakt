import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('changelog tag', () => {
	it('should convert version headings to releases', () => {
		const result = parse(`{% changelog %}
## v1.0.0 - 2024-01-01

- **Added** Initial release

## v1.1.0 - 2024-02-01

- **Fixed** Bug fix
{% /changelog %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Changelog');
		expect(tag).toBeDefined();

		const releases = findAllTags(tag!, t => t.attributes.typeof === 'ChangelogRelease');
		expect(releases.length).toBe(2);
	});

	it('should parse version and date from heading', () => {
		const result = parse(`{% changelog %}
## v2.1.0 - 2024-03-15

- Feature added
{% /changelog %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Changelog');
		const release = findTag(tag!, t => t.attributes.typeof === 'ChangelogRelease');
		expect(release).toBeDefined();

		const versionTag = findTag(release!, t => t.name === 'h3');
		expect(versionTag).toBeDefined();
		expect(versionTag!.children[0]).toBe('2.1.0');

		const dateTag = findTag(release!, t => t.name === 'time');
		expect(dateTag).toBeDefined();
		expect(dateTag!.children[0]).toBe('2024-03-15');
	});

	it('should pass project attribute as meta', () => {
		const result = parse(`{% changelog project="refrakt.md" %}
## v1.0.0 - 2024-01-01

- Initial release
{% /changelog %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Changelog');
		const projectMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === 'refrakt.md');
		expect(projectMeta).toBeDefined();
	});

	it('should handle version without v prefix', () => {
		const result = parse(`{% changelog %}
## 1.0.0 - 2024-01-01

- Release
{% /changelog %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Changelog');
		const release = findTag(tag!, t => t.attributes.typeof === 'ChangelogRelease');

		const versionTag = findTag(release!, t => t.name === 'h3');
		expect(versionTag!.children[0]).toBe('1.0.0');
	});
});
