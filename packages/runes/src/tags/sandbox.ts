import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import type { ProjectFiles, ResolvedSecurityPolicy } from '@refrakt-md/types';
import {
	createComponentRenderable,
	createContentModelSchema,
	sanitizeSandboxContent,
} from '../lib/index.js';
import { assembleFromDirectory, mergeContent } from '../sandbox-sources.js';

function dedent(text: string): string {
	const lines = text.split('\n');
	const indents = lines
		.filter((l) => l.trim().length > 0)
		.map((l) => l.match(/^(\s*)/)?.[0].length ?? 0);
	const min = indents.length > 0 ? Math.min(...indents) : 0;
	return min > 0 ? lines.map((l) => l.slice(min)).join('\n') : text;
}

interface SourcePanel {
	label: string;
	language: string;
	content: string;
	origin?: string;
}

function extractDataSourcePanels(html: string): SourcePanel[] {
	const panels: SourcePanel[] = [];
	const regex = /<(\w+)\b([^>]*?)\bdata-source(?:="([^"]*)")?([^>]*)>([\s\S]*?)<\/\1>/g;
	let match;
	while ((match = regex.exec(html)) !== null) {
		const [, tagName, before, labelAttr, after, inner] = match;
		const language = tagName === 'style' ? 'css' : tagName === 'script' ? 'javascript' : 'html';
		const defaultLabel = language.charAt(0).toUpperCase() + language.slice(1);
		let content: string;
		if (tagName === 'style' || tagName === 'script') {
			content = dedent(inner.trim());
		} else {
			const attrs = (before + after).replace(/\s{2,}/g, ' ').trim();
			const attrStr = attrs ? ` ${attrs}` : '';
			const reindented = dedent(inner)
				.split('\n')
				.map((l) => (l.trim().length > 0 ? '  ' + l : l))
				.join('\n');
			content = `<${tagName}${attrStr}>${reindented}</${tagName}>`.trim();
		}
		panels.push({ label: labelAttr || defaultLabel, language, content });
	}
	return panels;
}

function extractInlineContent(node: Node, config: Markdoc.Config): string {
	const raw = config.variables?.__source;
	if (typeof raw === 'string' && node.lines?.length >= 2) {
		const allLines = raw.split('\n');
		const start = node.lines[0] + 1;
		const end = node.lines[node.lines.length - 1] - 1;
		return allLines.slice(start, end).join('\n').trim();
	}
	return '';
}

export const sandbox = createContentModelSchema({
	attributes: {
		src: {
			type: String,
			required: false,
			description: 'Directory containing external source files',
		},
		framework: {
			type: String,
			required: false,
			description: 'JavaScript framework for the sandbox',
		},
		dependencies: {
			type: String,
			required: false,
			description: 'Comma-separated npm packages to include',
		},
		label: { type: String, required: false, description: 'Label displayed above the sandbox' },
		height: {
			type: [Number, String],
			required: false,
			description: 'Height of the sandbox iframe: pixels, "fill" (host owns height), or auto',
		},
		context: {
			type: String,
			required: false,
			description: 'Shared context scope for multiple sandboxes',
		},
		activation: {
			type: String,
			required: false,
			matches: ['eager', 'visible', 'click'],
			description: 'When to mount the iframe: eager (default) | visible | click',
		},
		poster: {
			type: String,
			required: false,
			description: 'Poster image URL shown until a non-eager sandbox activates',
		},
		data: {
			type: String,
			required: false,
			description:
				'Registry query (`field:value` clauses, e.g. "type:page") bound into the iframe as window.RF_DATA',
		},
		'data-fields': {
			type: String,
			required: false,
			description: 'Comma-separated entity data fields to project into the payload',
		},
		'data-shape': {
			type: String,
			required: false,
			description:
				'Payload shape: flat (default) | tree (nest by parentUrl) | graph (nodes + relationship edges)',
		},
		'data-limit': {
			type: Number,
			required: false,
			description: 'Max records in the payload (default 500)',
		},
	},
	rawBody: true,
	contentModel: {
		type: 'sequence',
		fields: [],
	},
	transform(resolved, attrs, config, node) {
		const src = attrs.src ?? '';
		const framework = attrs.framework ?? '';
		const dependencies = attrs.dependencies ?? '';
		const label = attrs.label ?? '';
		const context = attrs.context ?? '';
		const height = attrs.height;
		const dataQuery = attrs.data ?? '';
		const dataFields = attrs['data-fields'] ?? '';
		const dataShape = attrs['data-shape'] ?? '';
		const dataLimit = attrs['data-limit'];
		const activation =
			attrs.activation === 'visible' || attrs.activation === 'click' ? attrs.activation : '';
		const poster = attrs.poster ?? '';

		let rawContent = '';
		let sourcePanels: SourcePanel[] = [];

		const projectFiles = config.variables?.__sandboxFiles as ProjectFiles | undefined;
		const examplesDir = config.variables?.__sandboxExamplesDir as string | undefined;

		if (src && projectFiles && examplesDir !== undefined) {
			const dirPath = examplesDir
				? examplesDir.endsWith('/')
					? examplesDir + src
					: examplesDir + '/' + src
				: src;
			const result = assembleFromDirectory(
				dirPath,
				src,
				(p) => projectFiles.read(p),
				(p) => projectFiles.list(p),
				(p) => projectFiles.exists(p),
			);

			if (result.errors.length > 0) {
				rawContent = `<div data-source="HTML"><pre style="color:red;padding:1rem">${result.errors.join('\n')}</pre></div>`;
				sourcePanels = [];
			} else {
				rawContent = result.content;

				sourcePanels = result.panels.map((p) => ({
					label: p.label,
					language: p.language,
					content: p.content,
					origin: p.origin,
				}));
			}

			const inlineContent = extractInlineContent(node, config);
			if (inlineContent) {
				rawContent = mergeContent(rawContent, inlineContent);
				sourcePanels = extractDataSourcePanels(rawContent);
			}
		} else {
			rawContent = extractInlineContent(node, config);
			sourcePanels = extractDataSourcePanels(rawContent);
		}

		const policy = (config.variables?.__securityPolicy as ResolvedSecurityPolicy | undefined) ?? {
			trust: 'trusted',
			allowJs: true,
			sandboxOrigin: undefined,
		};
		const sanitisedContent = sanitizeSandboxContent(rawContent, policy);

		const fallbackPre = sanitisedContent
			? new Tag('pre', { 'data-language': 'html' }, [
					new Tag('code', { 'data-language': 'html' }, [sanitisedContent]),
				])
			: undefined;

		const sourceOrigins = sourcePanels
			.filter((p) => p.origin)
			.map((p) => `${p.label}\t${p.origin}`);

		const children: InstanceType<typeof Tag>[] = [];
		if (fallbackPre) {
			children.push(new Tag('template', { 'data-content': 'fallback' }, [fallbackPre]));
		}
		children.push(new Tag('template', { 'data-content': 'source' }, [sanitisedContent]));

		const el = createComponentRenderable({
			rune: 'sandbox',
			tag: 'div',
			properties: context ? { context: new Tag('meta', { content: context }) } : undefined,
			children,
		});
		el.name = 'rf-sandbox';
		Object.assign(el.attributes, {
			'data-source-content': sanitisedContent,
			...(framework ? { 'data-framework': framework } : {}),
			...(dependencies ? { 'data-dependencies': dependencies } : {}),
			...(label ? { 'data-label': label } : {}),
			'data-height':
				typeof height === 'number'
					? String(height)
					: height === 'fill'
						? 'fill'
						: typeof height === 'string' && /^\d+$/.test(height)
							? height
							: 'auto',
			...(sourceOrigins.length > 0 ? { 'data-source-origins': sourceOrigins.join('\n') } : {}),
			'data-security-mode': policy.trust,
			'data-allow-js': policy.allowJs ? 'true' : 'false',
			...(policy.sandboxOrigin ? { 'data-sandbox-origin': policy.sandboxOrigin } : {}),
			...(activation
				? {
						'data-activation': activation,
						...(poster ? { 'data-poster': poster } : {}),
					}
				: {}),
			...(dataQuery
				? {
						'data-rf-query': dataQuery,
						...(dataFields ? { 'data-rf-fields': dataFields } : {}),
						...(dataShape ? { 'data-rf-shape': dataShape } : {}),
						...(dataLimit != null ? { 'data-rf-limit': String(dataLimit) } : {}),
					}
				: {}),
		});
		return el;
	},
});
