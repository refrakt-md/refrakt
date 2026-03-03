import type { RuneConfig } from '@refrakt-md/transform';

export const config: Record<string, RuneConfig> = {
	Api: {
		block: 'api',
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
					{ tag: 'span', ref: 'method', metaText: 'method' },
					{ tag: 'code', ref: 'path', metaText: 'path' },
					{ tag: 'span', ref: 'auth', metaText: 'auth', condition: 'auth' },
				],
			},
		},
	},
	Symbol: {
		block: 'symbol',
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
					{ tag: 'span', ref: 'kind-badge', metaText: 'kind' },
					{ tag: 'span', ref: 'lang-badge', metaText: 'lang' },
					{ tag: 'span', ref: 'since-badge', metaText: 'since', textPrefix: 'Since ', condition: 'since' },
					{ tag: 'span', ref: 'deprecated-badge', metaText: 'deprecated', textPrefix: 'Deprecated ', condition: 'deprecated' },
					{ tag: 'a', ref: 'source-link', condition: 'source', attrs: { href: { fromModifier: 'source' } }, children: ['Source'] },
				],
			},
		},
	},
	SymbolGroup: { block: 'symbol-group', parent: 'Symbol' },
	SymbolMember: { block: 'symbol-member', parent: 'Symbol' },
	Changelog: { block: 'changelog' },
	ChangelogRelease: { block: 'changelog-release', parent: 'Changelog' },
};
