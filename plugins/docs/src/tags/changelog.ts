import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import {
	createComponentRenderable,
	createContentModelSchema,
	bodyOnly,
	asNodes,
	renderNodes,
	RenderableNodeCursor,
	pageSectionProperties,
} from '@refrakt-md/runes';

/**
 * Split a release heading into version, optional title and optional date:
 *
 *   "v2.1.0 - 2024-01-15"                      → 2.1.0, —, 2024-01-15
 *   "0.1.0 — January 2024"                     → 0.1.0, —, January 2024
 *   "v0.41.0 · Composed runes - Oct 9, 2026"   → 0.41.0, Composed runes, Oct 9, 2026
 *   "v0.41.1"                                  → 0.41.1, —, —
 *
 * The title follows a middle dot; the date follows a dash (hyphen, en or em).
 * After a title the dash needs spaces around it, so a title may contain a bare
 * hyphen ("render-stack") but not " - ". A leading `v` is dropped, as it always
 * was for a dated heading and now is for an undated one too. A heading that is
 * not a version is the version as is.
 */
export function parseReleaseHeading(text: string): {
	version: string;
	title: string;
	date: string;
} {
	const version = String.raw`v?(\d[\w.]*(?:-[\w.]+)?)`;
	// With a title, the date needs spaces around its dash, so a hyphenated title
	// is not split. Without one, the original lenient form ("0.1.0—Jan") stands.
	const titled = text.match(new RegExp(`^${version}\\s+·\\s+(.+?)(?:\\s+[-–—]\\s+(.+))?$`));
	if (titled)
		return { version: titled[1], title: titled[2].trim(), date: (titled[3] ?? '').trim() };
	const dated = text.match(new RegExp(`^${version}\\s*[-–—]\\s*(.+)$`));
	if (dated) return { version: dated[1], title: '', date: dated[2].trim() };
	const bare = text.trim().match(new RegExp(`^${version}$`));
	if (bare) return { version: bare[1], title: '', date: '' };
	return { version: text, title: '', date: '' };
}

export const changelogRelease = createContentModelSchema({
	attributes: {
		version: { type: String, required: false },
		title: { type: String, required: false },
		date: { type: String, required: false },
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		// The title rides inside the version heading, so the release reads as one
		// line: "v0.41.0 · Composed runes you can ship". The separator is the
		// theme's (Lumina draws it with ::before), not text in the heading.
		const titleTag = attrs.title ? new Tag('span', {}, [attrs.title]) : undefined;
		const versionTag = new Tag('h3', {}, [
			attrs.version ?? '',
			...(titleTag ? [' ', titleTag] : []),
		]);
		const dateTag = new Tag('time', {}, [attrs.date ?? '']);
		const body = renderNodes(resolved.body, config).wrap('div');

		return createComponentRenderable({
			rune: 'changelog-release',
			tag: 'section',
			properties: {
				date: dateTag,
			},
			refs: {
				version: versionTag,
				...(titleTag ? { title: titleTag } : {}),
				body: body.tag('div'),
			},
			children: [versionTag, dateTag, body.next()],
		});
	},
});

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const changelogSections = { preamble: 'preamble', headline: 'title' } as const;

export const changelog = createContentModelSchema({
	sections: changelogSections,
	attributes: {
		project: {
			type: String,
			required: false,
			description: 'Project name displayed in the changelog header.',
		},
	},
	contentModel: () => ({
		type: 'sections' as const,
		sectionHeading: 'heading',
		fields: [
			{ name: 'header', match: 'heading|paragraph', optional: true, greedy: true },
			{ name: 'items', match: 'tag', optional: true, greedy: true },
		],
		sectionModel: {
			type: 'sequence' as const,
			fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
		},
	}),
	transform(resolved, attrs, config) {
		const headerNodes = renderNodes(resolved.header, config);
		const projectMeta = new Tag('meta', { content: attrs.project ?? '' });

		// Convert resolved sections to changelog-release tag nodes
		const sections = resolved.sections as any[];
		const releaseTagNodes = sections.map((section: any) => {
			const { version, title, date } = parseReleaseHeading(section.$heading as string);
			const attributes = title ? { version, title, date } : { version, date };
			return new Ast.Node('tag', attributes, asNodes(section.body), 'changelog-release');
		});

		// Combine explicit child tags (preamble items) with heading-derived releases
		const allReleases = [...asNodes(resolved.items), ...releaseTagNodes];
		const sectionNodes = new RenderableNodeCursor(
			Markdoc.transform(allReleases, config) as RenderableTreeNode[],
		);

		const releases = sectionNodes.tag('section').typeof('ChangelogRelease');
		const releasesDiv = new Tag('div', {}, releases.toArray());

		const children: any[] = [];
		if (headerNodes.count() > 0) {
			children.push(headerNodes.wrap('header').next());
		}
		children.push(releasesDiv);

		return createComponentRenderable({
			rune: 'changelog',
			tag: 'section',
			properties: {
				project: projectMeta,
				release: releases,
			},
			refs: { ...pageSectionProperties(headerNodes), releases: releasesDiv },
			children,
		});
	},
});
