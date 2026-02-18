import type { LanguageRegistration } from 'shiki';

/**
 * TextMate grammar for Markdoc syntax.
 *
 * Highlights `{% tag %}` blocks with rune names, attributes, string values,
 * numbers, and booleans. Markdown is the base language.
 *
 * Reusable by the VS Code extension (Phase 9a).
 */
export const markdocLanguage: LanguageRegistration = {
	name: 'markdoc',
	scopeName: 'text.html.markdoc',
	displayName: 'Markdoc',
	embeddedLangs: ['markdown', 'html'],
	patterns: [
		{ include: '#sandbox-block' },
		{ include: '#markdoc-tag' },
		{ include: 'text.html.markdown' },
	],
	repository: {
		'sandbox-block': {
			name: 'meta.block.sandbox.markdoc',
			contentName: 'meta.embedded.block.html',
			begin: '(\\{%)(\\s*sandbox)((?:\\s+[^%]*)?)(%\\})',
			end: '(\\{%)(\\s*/sandbox\\s*)(%\\})',
			beginCaptures: {
				1: { name: 'punctuation.definition.tag.begin.markdoc' },
				2: { name: 'entity.name.tag.markdoc' },
				3: { patterns: [{ include: '#tag-attributes' }] },
				4: { name: 'punctuation.definition.tag.end.markdoc' },
			},
			endCaptures: {
				1: { name: 'punctuation.definition.tag.begin.markdoc' },
				2: { name: 'entity.name.tag.markdoc' },
				3: { name: 'punctuation.definition.tag.end.markdoc' },
			},
			patterns: [
				{ include: 'text.html.basic' },
			],
		},
		'markdoc-tag': {
			name: 'meta.tag.markdoc',
			begin: '(\\{%)(\\s*\\/?\\s*[a-z][a-z0-9-]*)',
			end: '(%\\})',
			beginCaptures: {
				1: { name: 'punctuation.definition.tag.begin.markdoc' },
				2: { name: 'entity.name.tag.markdoc' },
			},
			endCaptures: {
				1: { name: 'punctuation.definition.tag.end.markdoc' },
			},
			patterns: [
				{ include: '#tag-attributes' },
			],
		},
		'tag-attributes': {
			patterns: [
				{ include: '#attribute-name' },
				{ include: '#attribute-value-string' },
				{ include: '#attribute-value-number' },
				{ include: '#attribute-value-boolean' },
			],
		},
		'attribute-name': {
			name: 'entity.other.attribute-name.markdoc',
			match: '[a-zA-Z_][a-zA-Z0-9_-]*(?=\\s*=)',
		},
		'attribute-value-string': {
			name: 'string.quoted.double.markdoc',
			begin: '"',
			end: '"',
		},
		'attribute-value-number': {
			name: 'constant.numeric.markdoc',
			match: '\\b\\d+\\b',
		},
		'attribute-value-boolean': {
			name: 'constant.language.markdoc',
			match: '\\b(true|false)\\b',
		},
	},
};
