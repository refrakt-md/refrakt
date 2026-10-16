import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags, fields } from './helpers.js';
import { parseReleaseHeading } from '../src/tags/changelog.js';

describe('changelog tag', () => {
	it('should convert version headings to releases', () => {
		const result = parse(`{% changelog %}
## v1.0.0 - 2024-01-01

- **Added** Initial release

## v1.1.0 - 2024-02-01

- **Fixed** Bug fix
{% /changelog %}`);

		const tag = findTag(result as any, (t) => t.attributes['data-rune'] === 'changelog');
		expect(tag).toBeDefined();

		const releases = findAllTags(tag!, (t) => t.attributes['data-rune'] === 'changelog-release');
		expect(releases.length).toBe(2);
	});

	it('should parse version and date from heading', () => {
		const result = parse(`{% changelog %}
## v2.1.0 - 2024-03-15

- Feature added
{% /changelog %}`);

		const tag = findTag(result as any, (t) => t.attributes['data-rune'] === 'changelog');
		const release = findTag(tag!, (t) => t.attributes['data-rune'] === 'changelog-release');
		expect(release).toBeDefined();

		const versionTag = findTag(release!, (t) => t.name === 'h3');
		expect(versionTag).toBeDefined();
		expect(versionTag!.children[0]).toBe('2.1.0');

		const dateTag = findTag(release!, (t) => t.name === 'time');
		expect(dateTag).toBeDefined();
		expect(dateTag!.children[0]).toBe('2024-03-15');
	});

	it('should pass project attribute as meta', () => {
		const result = parse(`{% changelog project="refrakt.md" %}
## v1.0.0 - 2024-01-01

- Initial release
{% /changelog %}`);

		const tag = findTag(result as any, (t) => t.attributes['data-rune'] === 'changelog');
		expect(fields(tag).project).toBe('refrakt.md');
	});

	it('should handle version without v prefix', () => {
		const result = parse(`{% changelog %}
## 1.0.0 - 2024-01-01

- Release
{% /changelog %}`);

		const tag = findTag(result as any, (t) => t.attributes['data-rune'] === 'changelog');
		const release = findTag(tag!, (t) => t.attributes['data-rune'] === 'changelog-release');

		const versionTag = findTag(release!, (t) => t.name === 'h3');
		expect(versionTag!.children[0]).toBe('1.0.0');
	});

	it('renders a title after a middle dot inside the version heading', () => {
		const result = parse(`{% changelog %}
## v0.41.0 · Composed runes you can ship - October 9, 2026

Summary.
{% /changelog %}`);

		const release = findTag(
			result as any,
			(t) => t.attributes['data-rune'] === 'changelog-release',
		);
		const versionTag = findTag(release!, (t) => t.name === 'h3');
		expect(versionTag!.children[0]).toBe('0.41.0');
		const titleTag = findTag(versionTag!, (t) => t.attributes['data-name'] === 'title');
		expect(titleTag!.children).toEqual(['Composed runes you can ship']);
		expect(findTag(release!, (t) => t.name === 'time')!.children[0]).toBe('October 9, 2026');
	});

	it('renders no title element when the heading has none', () => {
		const result = parse(`{% changelog %}
## v1.0.0 - 2024-01-01

- Initial release
{% /changelog %}`);

		const release = findTag(
			result as any,
			(t) => t.attributes['data-rune'] === 'changelog-release',
		);
		expect(findTag(release!, (t) => t.attributes['data-name'] === 'title')).toBeUndefined();
	});
});

describe('parseReleaseHeading', () => {
	it('reads version, title and date', () => {
		expect(parseReleaseHeading('v0.41.0 · Composed runes you can ship - October 9, 2026')).toEqual({
			version: '0.41.0',
			title: 'Composed runes you can ship',
			date: 'October 9, 2026',
		});
	});

	it('keeps a hyphen inside the title', () => {
		expect(
			parseReleaseHeading('v0.30.0 · Plan validation & render-stack removal - May 1, 2026'),
		).toEqual({
			version: '0.30.0',
			title: 'Plan validation & render-stack removal',
			date: 'May 1, 2026',
		});
	});

	it('parses the forms that predate titles exactly as before', () => {
		expect(parseReleaseHeading('v2.1.0 - 2024-03-15')).toEqual({
			version: '2.1.0',
			title: '',
			date: '2024-03-15',
		});
		expect(parseReleaseHeading('0.1.0—January 2024')).toEqual({
			version: '0.1.0',
			title: '',
			date: 'January 2024',
		});
		expect(parseReleaseHeading('1.0.0-beta.2 - March 2025').version).toBe('1.0.0-beta.2');
	});

	it('drops the v from an undated version, and leaves other text alone', () => {
		expect(parseReleaseHeading('v0.41.1')).toEqual({ version: '0.41.1', title: '', date: '' });
		expect(parseReleaseHeading('Unreleased')).toEqual({
			version: 'Unreleased',
			title: '',
			date: '',
		});
	});
});
