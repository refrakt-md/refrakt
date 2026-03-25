import Markdoc from '@markdoc/markdoc';
import type { PackagePipelineHooks, EntityRegistration } from '@refrakt-md/types';

const { Tag } = Markdoc;

const STORYTELLING_ENTITY_TYPES = new Set(['character', 'realm', 'faction', 'lore', 'plot', 'bond']);

/** Tags where cross-links should not resolve */
const EXCLUDED_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'code']);

function walkTags(node: unknown, fn: (tag: InstanceType<typeof Tag>) => void): void {
	if (Markdoc.Tag.isTag(node)) {
		fn(node);
		for (const child of node.children) walkTags(child, fn);
	} else if (Array.isArray(node)) {
		node.forEach(n => walkTags(n, fn));
	}
}

function extractTextContent(node: unknown): string {
	if (typeof node === 'string') return node;
	if (!Markdoc.Tag.isTag(node)) return '';
	return node.children.map(c => extractTextContent(c)).join('');
}

/** Convert camelCase to kebab-case (matching engine convention) */
function toKebabCase(s: string): string {
	return s
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
		.toLowerCase();
}

function readField(tag: InstanceType<typeof Tag>, field: string): string {
	const kebab = toKebabCase(field);
	const meta = tag.children.find(
		(c: unknown) => Markdoc.Tag.isTag(c) && c.attributes['data-field'] === kebab,
	);
	return Markdoc.Tag.isTag(meta) ? (meta.attributes.content as string) ?? '' : '';
}

function readRefText(tag: InstanceType<typeof Tag>, name: string): string {
	const ref = tag.children.find(
		(c: unknown) => Markdoc.Tag.isTag(c) && c.attributes['data-name'] === name,
	);
	return ref ? extractTextContent(ref) : '';
}

/** Extract the display name for a storytelling entity based on rune type */
function extractEntityName(tag: InstanceType<typeof Tag>, runeType: string): string {
	switch (runeType) {
		case 'character':
		case 'realm':
		case 'faction':
			return readRefText(tag, 'name');
		case 'lore':
		case 'plot':
			return readRefText(tag, 'title');
		default:
			return '';
	}
}

/** Extract type-specific metadata for a storytelling entity */
function extractEntityData(tag: InstanceType<typeof Tag>, runeType: string): Record<string, unknown> {
	const data: Record<string, unknown> = {};
	switch (runeType) {
		case 'character':
			data.role = readField(tag, 'role');
			data.status = readField(tag, 'status');
			data.aliases = readField(tag, 'aliases');
			data.tags = readField(tag, 'tags');
			break;
		case 'realm':
			data.realmType = readField(tag, 'realmType');
			data.scale = readField(tag, 'scale');
			data.tags = readField(tag, 'tags');
			data.parent = readField(tag, 'parent');
			break;
		case 'faction':
			data.factionType = readField(tag, 'factionType');
			data.alignment = readField(tag, 'alignment');
			data.size = readField(tag, 'size');
			data.tags = readField(tag, 'tags');
			break;
		case 'lore':
			data.category = readField(tag, 'category');
			data.spoiler = readField(tag, 'spoiler');
			data.tags = readField(tag, 'tags');
			break;
		case 'plot':
			data.plotType = readField(tag, 'plotType');
			data.structure = readField(tag, 'structure');
			data.tags = readField(tag, 'tags');
			break;
		case 'bond':
			data.from = readRefText(tag, 'from');
			data.to = readRefText(tag, 'to');
			data.bondType = readField(tag, 'bondType');
			data.status = readField(tag, 'status');
			data.bidirectional = readField(tag, 'bidirectional');
			break;
	}
	return data;
}

export interface BondRelationship {
	target: string;
	bondType: string;
	status: string;
	bidirectional: boolean;
	sourceUrl: string;
}

export interface StorytellingAggregatedData {
	/** All registered entities by name for cross-link lookup */
	entityByName: Map<string, EntityRegistration>;
	/** Relationship graph from bonds: entityName → relationships */
	relationships: Map<string, BondRelationship[]>;
	/** Bond validation warnings (orphaned from/to references) */
	orphanedBonds: string[];
}

export const storytellingPipelineHooks: PackagePipelineHooks = {
	register(pages, registry, ctx) {
		for (const page of pages) {
			walkTags(page.renderable, (tag) => {
				const runeType = tag.attributes['data-rune'] as string;
				if (!STORYTELLING_ENTITY_TYPES.has(runeType)) return;

				if (runeType === 'bond') {
					const from = readRefText(tag, 'from');
					const to = readRefText(tag, 'to');
					if (!from || !to) {
						ctx.warn(`Bond missing from or to attribute`, page.url);
						return;
					}
					const data = extractEntityData(tag, runeType);
					data.name = `${from} → ${to}`;
					registry.register({
						type: 'bond',
						id: `${from}→${to}`,
						sourceUrl: page.url,
						data,
					});
					return;
				}

				const name = extractEntityName(tag, runeType);
				if (!name) {
					ctx.warn(`Storytelling ${runeType} missing name/title`, page.url);
					return;
				}

				const data = extractEntityData(tag, runeType);
				data.name = name;

				registry.register({
					type: runeType,
					id: name,
					sourceUrl: page.url,
					data,
				});
			});
		}
	},

	aggregate(registry, ctx) {
		// Build entity lookup by name (for cross-link resolution)
		const entityByName = new Map<string, EntityRegistration>();
		const entityTypes = ['character', 'realm', 'faction', 'lore', 'plot'];
		for (const type of entityTypes) {
			for (const entity of registry.getAll(type)) {
				entityByName.set(entity.id, entity);
				// Also register character aliases
				if (type === 'character') {
					const aliases = String(entity.data.aliases ?? '');
					if (aliases) {
						for (const alias of aliases.split(',').map(a => a.trim()).filter(Boolean)) {
							if (!entityByName.has(alias)) {
								entityByName.set(alias, entity);
							}
						}
					}
				}
			}
		}

		// Build relationship graph from bonds
		const relationships = new Map<string, BondRelationship[]>();
		const orphanedBonds: string[] = [];

		function addRelationship(from: string, rel: BondRelationship) {
			if (!relationships.has(from)) relationships.set(from, []);
			relationships.get(from)!.push(rel);
		}

		for (const bond of registry.getAll('bond')) {
			const from = String(bond.data.from ?? '');
			const to = String(bond.data.to ?? '');
			const bondType = String(bond.data.bondType ?? '');
			const status = String(bond.data.status ?? 'active');
			const bidirectional = String(bond.data.bidirectional ?? 'true') === 'true';

			// Validate references
			const fromExists = entityByName.has(from);
			const toExists = entityByName.has(to);

			if (!fromExists) {
				ctx.warn(`Bond references unknown entity "${from}"`, bond.sourceUrl);
				orphanedBonds.push(`${from} → ${to}`);
			}
			if (!toExists) {
				ctx.warn(`Bond references unknown entity "${to}"`, bond.sourceUrl);
				if (!orphanedBonds.includes(`${from} → ${to}`)) {
					orphanedBonds.push(`${from} → ${to}`);
				}
			}

			addRelationship(from, { target: to, bondType, status, bidirectional, sourceUrl: bond.sourceUrl });
			if (bidirectional) {
				addRelationship(to, { target: from, bondType, status, bidirectional, sourceUrl: bond.sourceUrl });
			}
		}

		return {
			entityByName,
			relationships,
			orphanedBonds,
		} satisfies StorytellingAggregatedData;
	},

	postProcess(page, aggregated) {
		const maybeStoryData = aggregated['storytelling'] as StorytellingAggregatedData | undefined;
		if (!maybeStoryData || !maybeStoryData.entityByName || maybeStoryData.entityByName.size === 0) return page;
		const storyData = maybeStoryData;

		const linkedNames = new Set<string>();
		let modified = false;

		function mapNode(node: unknown, insideRuneDepth: number): unknown {
			if (typeof node === 'string') return node;
			if (Array.isArray(node)) {
				const mapped = node.map(n => mapNode(n, insideRuneDepth));
				return mapped.some((n, i) => n !== node[i]) ? mapped : node;
			}
			if (!Markdoc.Tag.isTag(node)) return node;

			// Skip headings and code blocks entirely
			if (EXCLUDED_TAGS.has(node.name)) return node;

			// Skip nested runes (allow the page's top-level rune through)
			if (node.attributes['data-rune'] != null && insideRuneDepth > 0) return node;

			const newDepth = node.attributes['data-rune'] != null ? insideRuneDepth + 1 : insideRuneDepth;

			// Check for strong tags to cross-link
			if (node.name === 'strong') {
				const text = extractTextContent(node).trim();
				if (text && !linkedNames.has(text)) {
					const entity = storyData.entityByName.get(text);
					if (entity && entity.sourceUrl !== page.url) {
						linkedNames.add(text);
						modified = true;
						return new Tag('a', { href: entity.sourceUrl }, [node]);
					}
				}
			}

			// Recurse children
			const newChildren = node.children.map((c: unknown) => mapNode(c, newDepth));
			const changed = newChildren.some((c: unknown, i: number) => c !== node.children[i]);
			if (changed) {
				return new Tag(node.name, node.attributes, newChildren as any[]);
			}
			return node;
		}

		const newRenderable = mapNode(page.renderable, 0);
		if (!modified) return page;
		return { ...page, renderable: newRenderable as typeof page.renderable };
	},
};
