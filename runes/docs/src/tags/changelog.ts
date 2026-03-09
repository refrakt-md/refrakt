import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { attribute, Model, createComponentRenderable, createContentModelSchema, createSchema, asNodes, RenderableNodeCursor, pageSectionProperties } from '@refrakt-md/runes';
import { schema } from '../types.js';

// Parse "v2.1.0 - 2024-01-15" or "0.1.0 — January 2024"
const VERSION_DATE_PATTERN = /^v?([\d.]+(?:-[\w.]+)?)\s*[-–—]\s*(.+)$/;

class ChangelogReleaseModel extends Model {
	@attribute({ type: String, required: false })
	version: string = '';

	@attribute({ type: String, required: false })
	date: string = '';

	transform(): RenderableTreeNodes {
		const versionTag = new Tag('h3', {}, [this.version]);
		const dateTag = new Tag('time', {}, [this.date]);
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.ChangelogRelease, {
			tag: 'section',
			properties: {
				version: versionTag,
				date: dateTag,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [versionTag, dateTag, body.next()],
		});
	}
}

export const changelogRelease = createSchema(ChangelogReleaseModel);

export const changelog = createContentModelSchema({
	attributes: {
		headingLevel: { type: Number, required: false },
		project: { type: String, required: false },
	},
	contentModel: (attrs) => ({
		type: 'sections' as const,
		sectionHeading: attrs.headingLevel ? `heading:${attrs.headingLevel}` : 'heading',
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
		const headerNodes = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
		);
		const projectMeta = new Tag('meta', { content: attrs.project ?? '' });

		// Convert resolved sections to changelog-release tag nodes
		const sections = resolved.sections as any[];
		const releaseTagNodes = sections.map((section: any) => {
			const headingText = section.$heading as string;
			const match = headingText.match(VERSION_DATE_PATTERN);
			const version = match ? match[1].trim() : headingText;
			const date = match ? match[2].trim() : '';

			return new Ast.Node(
				'tag',
				{ version, date },
				asNodes(section.body),
				'changelog-release',
			);
		});

		// Combine explicit child tags (preamble items) with heading-derived releases
		const allReleases = [...asNodes(resolved.items), ...releaseTagNodes];
		const sectionNodes = new RenderableNodeCursor(
			Markdoc.transform(allReleases, config) as RenderableTreeNode[],
		);

		const releases = sectionNodes.tag('section').typeof('ChangelogRelease');
		const releasesDiv = new Tag('div', {}, releases.toArray());

		const children: any[] = [projectMeta];
		if (headerNodes.count() > 0) {
			children.push(headerNodes.wrap('header').next());
		}
		children.push(releasesDiv);

		return createComponentRenderable(schema.Changelog, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(headerNodes),
				project: projectMeta,
				release: releases,
			},
			refs: { releases: releasesDiv },
			children,
		});
	},
});
