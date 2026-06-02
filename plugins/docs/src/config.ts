import type { RuneConfig } from '@refrakt-md/transform';

const pageSectionAutoLabel = {
	header: 'preamble',
	eyebrow: 'eyebrow',
	headline: 'headline',
	blurb: 'blurb',
	image: 'image',
};

export const config: Record<string, RuneConfig> = {
	Api: {
		block: 'api',
		defaultDensity: 'full',
		sections: { body: 'body' },
		modifiers: {
			method: { source: 'meta', default: 'GET' },
			path: { source: 'meta' },
			auth: { source: 'meta' },
		},
		metaFields: {
			method: { metaType: 'category', sentimentMap: { GET: 'positive', POST: 'neutral', PUT: 'neutral', PATCH: 'caution', DELETE: 'negative' } },
			path: { metaType: 'code' },
			auth: { metaType: 'status', condition: 'auth' },
		},
		// Endpoint header as a single bar: method + path on the left, auth
		// pushed to the right. Shape is intrinsic — method/auth are chips
		// (category/status), path is bare monospace (code).
		blocks: {
			eyebrow: { fields: ['method', 'path', { field: 'auth', align: 'end' }], layout: 'bar', wrap: false },
		},
		layout: { root: ['eyebrow', 'body'] },
		editHints: { body: 'none', method: 'none', path: 'none', auth: 'none' },
	},
	Symbol: {
		block: 'symbol',
		defaultDensity: 'full',
		sections: { header: 'header', preamble: 'preamble', headline: 'title', body: 'body' },
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
					{ tag: 'span', ref: 'kind-badge', metaText: 'kind', metaType: 'category' },
					{ tag: 'span', ref: 'lang-badge', metaText: 'lang', metaType: 'category' },
					{ tag: 'span', ref: 'since-badge', metaText: 'since', label: 'Since:', condition: 'since', metaType: 'temporal' },
					{ tag: 'span', ref: 'deprecated-badge', metaText: 'deprecated', label: 'Deprecated:', condition: 'deprecated', metaType: 'status', sentimentMap: { true: 'negative' } },
					{ tag: 'a', ref: 'source-link', condition: 'source', attrs: { href: { fromModifier: 'source' } }, children: ['Source'] },
				],
			},
		},
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', body: 'none', 'kind-badge': 'none', 'lang-badge': 'none', 'since-badge': 'none', 'deprecated-badge': 'none', 'source-link': 'link' },
	},
	SymbolGroup: { block: 'symbol-group', parent: 'Symbol', editHints: { label: 'inline', body: 'none' } },
	SymbolMember: { block: 'symbol-member', parent: 'Symbol', editHints: { name: 'inline', body: 'none' } },
	Changelog: { block: 'changelog', defaultDensity: 'full', sections: { preamble: 'preamble', headline: 'title' }, autoLabel: pageSectionAutoLabel, editHints: { headline: 'inline', releases: 'none' } },
	ChangelogRelease: { block: 'changelog-release', parent: 'Changelog', editHints: { version: 'inline', body: 'none' } },
};
