import type { RuneConfig } from '@refrakt-md/transform';

const pageSectionAutoLabel = {
	header: 'header',
	eyebrow: 'eyebrow',
	headline: 'headline',
	blurb: 'blurb',
	image: 'image',
};

export const config: Record<string, RuneConfig> = {
	Api: {
		block: 'api',
		defaultDensity: 'full',
		sections: { header: 'header', body: 'body' },
		contentWrapper: { tag: 'div', ref: 'body' },
		modifiers: {
			method: { source: 'meta', default: 'GET' },
			path: { source: 'meta' },
			auth: { source: 'meta' },
		},
		structure: {
			header: {
				tag: 'div', before: true,
				children: [
					{ tag: 'span', ref: 'method', metaText: 'method', metaType: 'category', metaRank: 'primary', sentimentMap: { GET: 'positive', POST: 'neutral', PUT: 'neutral', PATCH: 'caution', DELETE: 'negative' } },
					{ tag: 'code', ref: 'path', metaText: 'path', metaType: 'id', metaRank: 'primary' },
					{ tag: 'span', ref: 'auth', metaText: 'auth', condition: 'auth', metaType: 'status', metaRank: 'secondary' },
				],
			},
		},
		editHints: { body: 'none', method: 'none', path: 'none', auth: 'none' },
	},
	Symbol: {
		block: 'symbol',
		defaultDensity: 'full',
		sections: { header: 'header', headline: 'title', body: 'body' },
		contentWrapper: { tag: 'div', ref: 'body' },
		modifiers: {
			kind: { source: 'meta', default: 'function' },
			lang: { source: 'meta', default: 'typescript' },
			since: { source: 'meta' },
			deprecated: { source: 'meta' },
			source: { source: 'meta' },
		},
		structure: {
			header: {
				tag: 'div', before: true,
				children: [
					{ tag: 'span', ref: 'kind-badge', metaText: 'kind', metaType: 'category', metaRank: 'primary' },
					{ tag: 'span', ref: 'lang-badge', metaText: 'lang', metaType: 'category', metaRank: 'secondary' },
					{ tag: 'span', ref: 'since-badge', metaText: 'since', textPrefix: 'Since ', condition: 'since', metaType: 'temporal', metaRank: 'secondary' },
					{ tag: 'span', ref: 'deprecated-badge', metaText: 'deprecated', textPrefix: 'Deprecated ', condition: 'deprecated', metaType: 'status', metaRank: 'primary', sentimentMap: { true: 'negative' } },
					{ tag: 'a', ref: 'source-link', condition: 'source', attrs: { href: { fromModifier: 'source' } }, children: ['Source'] },
				],
			},
		},
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', body: 'none', 'kind-badge': 'none', 'lang-badge': 'none', 'since-badge': 'none', 'deprecated-badge': 'none', 'source-link': 'link' },
	},
	SymbolGroup: { block: 'symbol-group', parent: 'Symbol', editHints: { label: 'inline', body: 'none' } },
	SymbolMember: { block: 'symbol-member', parent: 'Symbol', editHints: { name: 'inline', body: 'none' } },
	Changelog: { block: 'changelog', defaultDensity: 'full', sections: { header: 'header', headline: 'title' }, autoLabel: pageSectionAutoLabel, editHints: { headline: 'inline', releases: 'none' } },
	ChangelogRelease: { block: 'changelog-release', parent: 'Changelog', editHints: { version: 'inline', body: 'none' } },
};
