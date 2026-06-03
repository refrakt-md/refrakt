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
		sections: { preamble: 'preamble', headline: 'title', body: 'body' },
		modifiers: {
			kind: { source: 'meta', default: 'function' },
			lang: { source: 'meta', default: 'typescript' },
			since: { source: 'meta' },
			deprecated: { source: 'meta' },
			source: { source: 'meta' },
		},
		metaFields: {
			kind: { metaType: 'category' },
			lang: { metaType: 'category' },
			since: { metaType: 'temporal', label: 'Since', condition: 'since' },
			deprecated: { metaType: 'status', label: 'Deprecated', condition: 'deprecated', sentimentMap: { true: 'negative' } },
			source: { label: 'Source', href: 'source', condition: 'source' },
		},
		// Signature bar (kind + lang chips, source link pushed right) above the
		// title; version facts (since / deprecated) as a labelled def-list.
		blocks: {
			eyebrow: { fields: ['kind', 'lang', { field: 'source', align: 'end' }], layout: 'bar' },
			metadata: { fields: ['since', 'deprecated'], layout: 'definition-list' },
		},
		// SPEC-081: the transform emits flat header slots; `layout` builds the
		// preamble <header> (the `eyebrow` entry is the signature-bar block, not
		// a header slot), so headline/blurb are individually addressable.
		layout: {
			root: ['eyebrow', 'preamble', 'metadata', 'body'],
			preamble: { tag: 'header', children: ['headline', 'blurb', 'image'] },
		},
		autoLabel: pageSectionAutoLabel,
		editHints: { headline: 'inline', body: 'none', kind: 'none', lang: 'none', since: 'none', deprecated: 'none', source: 'link' },
	},
	SymbolGroup: { block: 'symbol-group', parent: 'Symbol', editHints: { label: 'inline', body: 'none' } },
	SymbolMember: { block: 'symbol-member', parent: 'Symbol', editHints: { name: 'inline', body: 'none' } },
	Changelog: { block: 'changelog', defaultDensity: 'full', sections: { preamble: 'preamble', headline: 'title' }, autoLabel: pageSectionAutoLabel, editHints: { headline: 'inline', releases: 'none' } },
	ChangelogRelease: { block: 'changelog-release', parent: 'Changelog', editHints: { version: 'inline', body: 'none' } },
};
