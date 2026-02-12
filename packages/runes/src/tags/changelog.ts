import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { pageSectionProperties } from './common.js';

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

class ChangelogModel extends Model {
	@attribute({ type: Number, required: false })
	headingLevel: number | undefined = undefined;

	@attribute({ type: String, required: false })
	project: string = '';

	@group({ include: ['heading', 'paragraph'] })
	header: NodeStream;

	@group({ include: ['tag'] })
	itemgroup: NodeStream;

	convertHeadings(nodes: Node[]) {
		// Auto-detect heading level from first heading if not specified
		const level = this.headingLevel ?? nodes.find(n => n.type === 'heading')?.attributes.level;
		if (!level) return nodes;

		const converted = headingsToList({ level })(nodes);
		const n = converted.length - 1;
		if (!converted[n] || converted[n].type !== 'list') return nodes;

		const tags = converted[n].children.map(item => {
			const heading = item.children[0];
			const headingText = Array.from(heading.walk())
				.filter(n => n.type === 'text')
				.map(t => t.attributes.content)
				.join(' ');

			const match = headingText.match(VERSION_DATE_PATTERN);
			const version = match ? match[1].trim() : headingText;
			const date = match ? match[2].trim() : '';

			return new Ast.Node('tag', { version, date }, item.children.slice(1), 'changelog-release');
		});

		converted.splice(n, 1, ...tags);
		return converted;
	}

	processChildren(nodes: Node[]) {
		return super.processChildren(this.convertHeadings(nodes));
	}

	transform(): RenderableTreeNodes {
		const header = this.header.transform();
		const itemStream = this.itemgroup.transform();
		const projectMeta = new Tag('meta', { content: this.project });

		const releases = itemStream.tag('section').typeof('ChangelogRelease');
		const releasesDiv = new Tag('div', {}, releases.toArray());

		const children: any[] = [projectMeta];
		if (header.count() > 0) {
			children.push(header.wrap('header').next());
		}
		children.push(releasesDiv);

		return createComponentRenderable(schema.Changelog, {
			tag: 'section',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(header),
				project: projectMeta,
				release: releases,
			},
			refs: { releases: releasesDiv },
			children,
		});
	}
}

export const changelogRelease = createSchema(ChangelogReleaseModel);

export const changelog = createSchema(ChangelogModel);
