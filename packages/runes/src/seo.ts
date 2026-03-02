import Markdoc from '@markdoc/markdoc';
import type { Tag, RenderableTreeNode, RenderableTreeNodes } from '@markdoc/markdoc';
import type { Rune } from './rune.js';

// ─── Output types ───

export interface PageSeo {
	jsonLd: object[];
	og: OgMeta;
}

export interface OgMeta {
	title?: string;
	description?: string;
	image?: string;
	type?: string;
	url?: string;
}

// ─── typeof → seoType lookup ───

/**
 * Build a map from typeof attribute values (e.g. 'Pricing', 'Accordion')
 * to seoType strings (e.g. 'Product', 'FAQPage').
 */
export function buildSeoTypeMap(runes: Record<string, Rune>): Map<string, string> {
	const map = new Map<string, string>();
	for (const rune of Object.values(runes)) {
		if (rune.seoType && rune.type) {
			map.set(rune.type.name, rune.seoType);
		}
	}
	return map;
}

// ─── Tree traversal helpers ───

/** Extract all text content from a tag tree */
export function textContent(tag: Tag): string {
	const parts: string[] = [];
	for (const child of tag.children) {
		if (typeof child === 'string') {
			parts.push(child);
		} else if (Markdoc.Tag.isTag(child)) {
			parts.push(textContent(child));
		}
	}
	return parts.join('').trim();
}

function findFirst(
	tree: RenderableTreeNodes,
	predicate: (tag: Tag) => boolean,
): Tag | undefined {
	if (Array.isArray(tree)) {
		for (const node of tree) {
			const found = findFirst(node as RenderableTreeNodes, predicate);
			if (found) return found;
		}
		return undefined;
	}
	if (!Markdoc.Tag.isTag(tree)) return undefined;
	if (predicate(tree)) return tree;
	for (const child of tree.children) {
		const found = findFirst(child as RenderableTreeNodes, predicate);
		if (found) return found;
	}
	return undefined;
}

function findAll(
	tree: RenderableTreeNodes,
	predicate: (tag: Tag) => boolean,
): Tag[] {
	const results: Tag[] = [];
	function walk(node: RenderableTreeNode) {
		if (Markdoc.Tag.isTag(node)) {
			if (predicate(node)) results.push(node);
			for (const child of node.children) walk(child);
		} else if (Array.isArray(node)) {
			for (const n of node) walk(n);
		}
	}
	if (Array.isArray(tree)) {
		for (const n of tree) walk(n as RenderableTreeNode);
	} else {
		walk(tree as RenderableTreeNode);
	}
	return results;
}

/** Find a child tag with a given property attribute */
function findProperty(tag: Tag, propertyName: string): Tag | undefined {
	for (const child of tag.children) {
		if (Markdoc.Tag.isTag(child) && child.attributes.property === propertyName) {
			return child;
		}
	}
	// Search one level deeper (properties can be wrapped in containers)
	for (const child of tag.children) {
		if (Markdoc.Tag.isTag(child)) {
			for (const grandchild of child.children) {
				if (Markdoc.Tag.isTag(grandchild) && grandchild.attributes.property === propertyName) {
					return grandchild;
				}
			}
		}
	}
	return undefined;
}

/** Get meta tag content value for a property */
function metaContent(tag: Tag, propertyName: string): string | number | undefined {
	const prop = findProperty(tag, propertyName);
	if (!prop) return undefined;
	if (prop.name === 'meta' && prop.attributes.content !== undefined) {
		return prop.attributes.content;
	}
	return textContent(prop) || undefined;
}

// ─── Per-type extractors ───

type Extractor = (tag: Tag) => object | object[];

function extractFAQPage(tag: Tag): object {
	const items = findAll(tag, t => t.attributes.typeof === 'AccordionItem');
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: items.map(item => {
			const nameTag = findProperty(item, 'name');
			const bodyTag = item.children.find(
				(c: any) => Markdoc.Tag.isTag(c) && c.attributes['data-name'] === 'body',
			) as Tag | undefined;
			return {
				'@type': 'Question',
				name: nameTag ? textContent(nameTag) : '',
				acceptedAnswer: {
					'@type': 'Answer',
					text: bodyTag ? textContent(bodyTag) : '',
				},
			};
		}),
	};
}

function extractProduct(tag: Tag): object {
	const headline = findProperty(tag, 'headline');
	const blurb = findProperty(tag, 'blurb');
	const tiers = findAll(
		tag,
		t => t.attributes.typeof === 'Tier' || t.attributes.typeof === 'FeaturedTier',
	);

	return {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: headline ? textContent(headline) : undefined,
		description: blurb ? textContent(blurb) : undefined,
		offers: tiers.map(tier => extractOffer(tier)),
	};
}

const CURRENCY_SYMBOLS: Record<string, string> = {
	'$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR',
	'kr': 'SEK', 'CHF': 'CHF', 'A$': 'AUD', 'C$': 'CAD',
};

function inferCurrency(priceText: string): string {
	for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
		if (priceText.startsWith(symbol)) return code;
	}
	return 'USD';
}

function extractOffer(tag: Tag): object {
	const name = findProperty(tag, 'name');
	const price = findProperty(tag, 'price');
	const currency = metaContent(tag, 'currency') as string | undefined;

	const priceText = price ? textContent(price) : '';
	const numericMatch = priceText.match(/[\d.]+/);

	return {
		'@type': 'Offer',
		name: name ? textContent(name) : undefined,
		price: numericMatch ? numericMatch[0] : priceText || undefined,
		priceCurrency: currency || inferCurrency(priceText),
	};
}

function extractReview(tag: Tag): object {
	const quote = findProperty(tag, 'quote');
	const authorName = findProperty(tag, 'authorName');
	const authorRole = findProperty(tag, 'authorRole');
	const ratingContent = metaContent(tag, 'rating');

	const result: Record<string, any> = {
		'@context': 'https://schema.org',
		'@type': 'Review',
		reviewBody: quote ? textContent(quote) : undefined,
	};

	if (authorName) {
		result.author = {
			'@type': 'Person',
			name: textContent(authorName),
			...(authorRole ? { jobTitle: textContent(authorRole) } : {}),
		};
	}

	if (ratingContent !== undefined) {
		result.reviewRating = {
			'@type': 'Rating',
			ratingValue: ratingContent,
		};
	}

	return result;
}

function extractBreadcrumbList(tag: Tag): object {
	const items = findAll(tag, t => t.attributes.typeof === 'BreadcrumbItem');
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => {
			const name = findProperty(item, 'name');
			const url = findProperty(item, 'url');
			return {
				'@type': 'ListItem',
				position: index + 1,
				name: name ? textContent(name) : '',
				...(url?.attributes?.href ? { item: url.attributes.href } : {}),
			};
		}),
	};
}

function extractItemList(tag: Tag): object {
	const entries = findAll(tag, t => t.attributes.typeof === 'TimelineEntry');
	return {
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		itemListElement: entries.map((entry, index) => {
			const date = findProperty(entry, 'date');
			const label = findProperty(entry, 'label');
			return {
				'@type': 'ListItem',
				position: index + 1,
				name: label ? textContent(label) : '',
				description: date ? textContent(date) : '',
			};
		}),
	};
}

function extractVideoObject(tag: Tag): object {
	return {
		'@context': 'https://schema.org',
		'@type': 'VideoObject',
		name: metaContent(tag, 'title') || undefined,
		contentUrl: metaContent(tag, 'url') || undefined,
		embedUrl: metaContent(tag, 'embedUrl') || undefined,
	};
}

function extractImageObject(tag: Tag): object {
	const img = findFirst(tag, t => t.name === 'img');
	const caption = findProperty(tag, 'caption');

	return {
		'@context': 'https://schema.org',
		'@type': 'ImageObject',
		contentUrl: img?.attributes?.src || undefined,
		caption: caption ? textContent(caption) : undefined,
	};
}

function extractMusicPlaylist(tag: Tag): object {
	const headline = findProperty(tag, 'headline');
	const tracks = findAll(tag, t => t.attributes.typeof === 'MusicRecording');

	return {
		'@context': 'https://schema.org',
		'@type': 'MusicPlaylist',
		name: headline ? textContent(headline) : undefined,
		numTracks: tracks.length,
		track: tracks.map(t => {
			const name = findProperty(t, 'name');
			const duration = findProperty(t, 'duration');
			return {
				'@type': 'MusicRecording',
				name: name ? textContent(name) : undefined,
				duration: duration?.attributes?.content || undefined,
			};
		}),
	};
}

function extractRecipe(tag: Tag): object {
	const headline = findProperty(tag, 'headline');
	const blurb = findProperty(tag, 'blurb');
	const img = findFirst(tag, t => t.name === 'img');

	const ul = findFirst(tag, t => t.name === 'ul');
	const ingredients = ul
		? findAll(ul, t => t.name === 'li').map(li => textContent(li))
		: [];

	const ol = findFirst(tag, t => t.name === 'ol');
	const steps = ol
		? findAll(ol, t => t.name === 'li').map(li => ({
			'@type': 'HowToStep',
			text: textContent(li),
		}))
		: [];

	return {
		'@context': 'https://schema.org',
		'@type': 'Recipe',
		name: headline ? textContent(headline) : undefined,
		description: blurb ? textContent(blurb) : undefined,
		image: img?.attributes?.src || undefined,
		prepTime: metaContent(tag, 'prepTime') || undefined,
		cookTime: metaContent(tag, 'cookTime') || undefined,
		recipeYield: metaContent(tag, 'servings') || undefined,
		recipeIngredient: ingredients.length ? ingredients : undefined,
		recipeInstructions: steps.length ? steps : undefined,
	};
}

function extractHowTo(tag: Tag): object {
	const headline = findProperty(tag, 'headline');
	const blurb = findProperty(tag, 'blurb');
	const img = findFirst(tag, t => t.name === 'img');

	const ul = findFirst(tag, t => t.name === 'ul');
	const tools = ul
		? findAll(ul, t => t.name === 'li').map(li => ({
			'@type': 'HowToTool',
			name: textContent(li),
		}))
		: [];

	const ol = findFirst(tag, t => t.name === 'ol');
	const steps = ol
		? findAll(ol, t => t.name === 'li').map(li => ({
			'@type': 'HowToStep',
			text: textContent(li),
		}))
		: [];

	return {
		'@context': 'https://schema.org',
		'@type': 'HowTo',
		name: headline ? textContent(headline) : undefined,
		description: blurb ? textContent(blurb) : undefined,
		image: img?.attributes?.src || undefined,
		totalTime: metaContent(tag, 'estimatedTime') || undefined,
		tool: tools.length ? tools : undefined,
		step: steps.length ? steps : undefined,
	};
}

function extractEvent(tag: Tag): object {
	const headline = findProperty(tag, 'headline');
	const blurb = findProperty(tag, 'blurb');
	const img = findFirst(tag, t => t.name === 'img');
	const location = metaContent(tag, 'location');

	return {
		'@context': 'https://schema.org',
		'@type': 'Event',
		name: headline ? textContent(headline) : undefined,
		description: blurb ? textContent(blurb) : undefined,
		image: img?.attributes?.src || undefined,
		startDate: metaContent(tag, 'date') || undefined,
		endDate: metaContent(tag, 'endDate') || undefined,
		location: location ? { '@type': 'Place', name: location } : undefined,
		url: metaContent(tag, 'url') || undefined,
	};
}

function extractPerson(tag: Tag): object | object[] {
	const members = findAll(tag, t => t.attributes.typeof === 'CastMember');

	if (members.length > 0) {
		const people = members.map(member => {
			const name = findProperty(member, 'name');
			const role = findProperty(member, 'role');
			return {
				'@context': 'https://schema.org',
				'@type': 'Person',
				name: name ? textContent(name) : undefined,
				jobTitle: role ? textContent(role) : undefined,
			};
		});

		return people.length === 1 ? people[0] : people;
	}

	// Character rune: single person
	const name = findProperty(tag, 'name');
	const role = metaContent(tag, 'role') as string | undefined;
	const img = findFirst(tag, t => t.name === 'img');

	return {
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: name ? textContent(name) : undefined,
		jobTitle: role || undefined,
		image: img?.attributes?.src || undefined,
	};
}

function extractOrganization(tag: Tag): object {
	const headline = findProperty(tag, 'headline');
	const blurb = findProperty(tag, 'blurb');
	const img = findFirst(tag, t => t.name === 'img');
	const orgType = metaContent(tag, 'type') as string | undefined;

	return {
		'@context': 'https://schema.org',
		'@type': orgType || 'Organization',
		name: headline ? textContent(headline) : undefined,
		description: blurb ? textContent(blurb) : undefined,
		image: img?.attributes?.src || undefined,
	};
}

function extractDataset(tag: Tag): object {
	const headline = findProperty(tag, 'headline');
	const blurb = findProperty(tag, 'blurb');

	return {
		'@context': 'https://schema.org',
		'@type': 'Dataset',
		name: headline ? textContent(headline) : undefined,
		description: blurb ? textContent(blurb) : undefined,
	};
}

function extractPlace(tag: Tag): object {
	const name = findProperty(tag, 'name');
	const img = findFirst(tag, t => t.name === 'img');
	const realmType = metaContent(tag, 'realmType') as string | undefined;

	return {
		'@context': 'https://schema.org',
		'@type': 'Place',
		name: name ? textContent(name) : undefined,
		additionalType: realmType || undefined,
		image: img?.attributes?.src || undefined,
	};
}

function extractArticle(tag: Tag): object {
	const title = findProperty(tag, 'title');
	const category = metaContent(tag, 'category') as string | undefined;

	return {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: title ? textContent(title) : undefined,
		articleSection: category || undefined,
	};
}

function extractCreativeWork(tag: Tag): object {
	const title = findProperty(tag, 'title');
	const plotType = metaContent(tag, 'plotType') as string | undefined;

	return {
		'@context': 'https://schema.org',
		'@type': 'CreativeWork',
		name: title ? textContent(title) : undefined,
		genre: plotType || undefined,
	};
}

// ─── Extractor registry ───

const extractors: Record<string, Extractor> = {
	FAQPage: extractFAQPage,
	Product: extractProduct,
	Review: extractReview,
	BreadcrumbList: extractBreadcrumbList,
	ItemList: extractItemList,
	VideoObject: extractVideoObject,
	ImageObject: extractImageObject,
	MusicPlaylist: extractMusicPlaylist,
	Recipe: extractRecipe,
	HowTo: extractHowTo,
	Event: extractEvent,
	Person: extractPerson,
	Organization: extractOrganization,
	Dataset: extractDataset,
	Place: extractPlace,
	Article: extractArticle,
	CreativeWork: extractCreativeWork,
};

// Child types extracted inline by their parent — skip as top-level
const CHILD_SEO_TYPES = new Set(['Offer', 'MusicRecording']);

// ─── Main extraction function ───

export function extractSeo(
	tree: RenderableTreeNodes,
	seoTypeMap: Map<string, string>,
	frontmatter: { title?: string; description?: string; image?: string; [key: string]: unknown },
	url: string,
): PageSeo {
	const jsonLd: object[] = [];

	const seoTags = findAll(
		tree,
		tag => !!tag.attributes?.typeof && seoTypeMap.has(tag.attributes.typeof),
	);

	for (const tag of seoTags) {
		const seoType = seoTypeMap.get(tag.attributes.typeof)!;
		if (CHILD_SEO_TYPES.has(seoType)) continue;

		const extractor = extractors[seoType];
		if (extractor) {
			const result = extractor(tag);
			if (Array.isArray(result)) {
				jsonLd.push(...result);
			} else {
				jsonLd.push(result);
			}
		}
	}

	const og = extractOgMeta(tree, frontmatter, url);

	return { jsonLd, og };
}

// ─── OG Meta extraction ───

function extractOgMeta(
	tree: RenderableTreeNodes,
	frontmatter: { title?: string; description?: string; image?: string; [key: string]: unknown },
	url: string,
): OgMeta {
	const og: OgMeta = { url, type: 'website' };

	// Priority 1: Frontmatter
	if (frontmatter.title) og.title = frontmatter.title;
	if (frontmatter.description) og.description = frontmatter.description;
	if (frontmatter.image) og.image = frontmatter.image as string;

	// Priority 2: Hero rune
	const hero = findFirst(tree, tag => tag.attributes?.typeof === 'Hero');
	if (hero) {
		if (!og.title) {
			const headline = findProperty(hero, 'headline');
			if (headline) og.title = textContent(headline);
		}
		if (!og.description) {
			const blurb = findProperty(hero, 'blurb');
			if (blurb) og.description = textContent(blurb).slice(0, 200);
		}
	}

	// Priority 3: First content elements
	if (!og.title) {
		const h1 = findFirst(tree, tag => tag.name === 'h1');
		if (h1) og.title = textContent(h1);
	}
	if (!og.description) {
		const p = findFirst(tree, tag => tag.name === 'p' && !tag.attributes.property);
		if (p) og.description = textContent(p).slice(0, 200);
	}
	if (!og.image) {
		const img = findFirst(tree, tag => tag.name === 'img');
		if (img) og.image = img.attributes.src;
	}

	return og;
}
