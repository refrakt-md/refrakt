import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import type { ResolvedSecurityPolicy } from '@refrakt-md/types';
import { createComponentRenderable, createContentModelSchema, sanitizeSandboxContent } from '../lib/index.js';
import { assembleFromDirectory, mergeContent } from '../sandbox-sources.js';

/** Strip common leading whitespace from all lines. */
function dedent(text: string): string {
	const lines = text.split('\n');
	const indents = lines.filter(l => l.trim().length > 0).map(l => l.match(/^(\s*)/)?.[0].length ?? 0);
	const min = indents.length > 0 ? Math.min(...indents) : 0;
	return min > 0 ? lines.map(l => l.slice(min)).join('\n') : text;
}

interface SourcePanel { label: string; language: string; content: string; origin?: string; }

function extractDataSourcePanels(html: string): SourcePanel[] {
	const panels: SourcePanel[] = [];
	const regex = /<(\w+)\b([^>]*?)\bdata-source(?:="([^"]*)")?([^>]*)>([\s\S]*?)<\/\1>/g;
	let match;
	while ((match = regex.exec(html)) !== null) {
		const [, tagName, before, labelAttr, after, inner] = match;
		const language = tagName === 'style' ? 'css'
			: tagName === 'script' ? 'javascript' : 'html';
		const defaultLabel = language.charAt(0).toUpperCase() + language.slice(1);
		let content: string;
		if (tagName === 'style' || tagName === 'script') {
			content = dedent(inner.trim());
		} else {
			const attrs = (before + after).replace(/\s{2,}/g, ' ').trim();
			const attrStr = attrs ? ` ${attrs}` : '';
			const reindented = dedent(inner).split('\n')
				.map(l => l.trim().length > 0 ? '  ' + l : l).join('\n');
			content = `<${tagName}${attrStr}>${reindented}</${tagName}>`.trim();
		}
		panels.push({ label: labelAttr || defaultLabel, language, content });
	}
	return panels;
}

/** Extract raw inline content from the markdown source using line ranges. */
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
		src: { type: String, required: false, description: 'Directory containing external source files' },
		framework: { type: String, required: false, description: 'JavaScript framework for the sandbox' },
		dependencies: { type: String, required: false, description: 'Comma-separated npm packages to include' },
		label: { type: String, required: false, description: 'Label displayed above the sandbox' },
		height: { type: Number, required: false, description: 'Height of the sandbox iframe in pixels' },
		context: { type: String, required: false, description: 'Shared context scope for multiple sandboxes' },
		// SPEC-093 — data binding: resolve a registry query at build time and
		// expose it to the iframe as `window.RF_DATA`.
		data: { type: String, required: false, description: 'Registry query (SPEC-070 field-match, e.g. "type:page") bound into the iframe as window.RF_DATA' },
		'data-fields': { type: String, required: false, description: 'Comma-separated entity data fields to project into the payload' },
		'data-shape': { type: String, required: false, description: 'Payload shape: flat (default) | tree (nest by parentUrl)' },
		'data-limit': { type: Number, required: false, description: 'Max records in the payload (default 500)' },
	},
	contentModel: {
		type: 'sequence',
		fields: [],
	},
	transform(resolved, attrs, config, node) {
		const src = attrs.src ?? '';
		const framework = attrs.framework ?? '';
		const dependencies = attrs.dependencies ?? '';
		const label = attrs.label ?? '';
		const height = attrs.height;
		const dataQuery = attrs.data ?? '';
		const dataFields = attrs['data-fields'] ?? '';
		const dataShape = attrs['data-shape'] ?? '';
		const dataLimit = attrs['data-limit'];

		let rawContent = '';
		let sourcePanels: SourcePanel[] = [];

		const readFile = config.variables?.__sandboxReadFile as ((p: string) => string | null) | undefined;
		const listDir = config.variables?.__sandboxListDir as ((p: string) => string[]) | undefined;
		const dirExists = config.variables?.__sandboxDirExists as ((p: string) => boolean) | undefined;
		const examplesDir = config.variables?.__sandboxExamplesDir as string | undefined;

		if (src && readFile && listDir && examplesDir) {
			// Directory source mode
			const dirPath = examplesDir.endsWith('/') ? examplesDir + src : examplesDir + '/' + src;
			const result = assembleFromDirectory(dirPath, src, readFile, listDir, dirExists);

			// If there are fatal errors, render an error message instead
			if (result.errors.length > 0) {
				rawContent = `<div data-source="HTML"><pre style="color:red;padding:1rem">${result.errors.join('\n')}</pre></div>`;
				sourcePanels = [];
			} else {
				rawContent = result.content;

				// Convert SandboxSourcePanels to local SourcePanels
				sourcePanels = result.panels.map(p => ({
					label: p.label,
					language: p.language,
					content: p.content,
					origin: p.origin,
				}));
			}

			// Append inline content if any exists between the sandbox tags
			const inlineContent = extractInlineContent(node, config);
			if (inlineContent) {
				rawContent = mergeContent(rawContent, inlineContent);
				// Re-extract panels from merged content
				sourcePanels = extractDataSourcePanels(rawContent);
			}
		} else {
			// Existing inline extraction
			rawContent = extractInlineContent(node, config);
			sourcePanels = extractDataSourcePanels(rawContent);
		}

		// Apply security policy: in `untrusted` + `allowJs:false` mode, strip
		// scripts/event-handlers/javascript-urls/dangerous-tags from rawContent
		// before it ships to the iframe. Source panels keep the original code
		// (visible code panels are inert) — the sanitised version is what runs.
		const policy = (config.variables?.__securityPolicy as ResolvedSecurityPolicy | undefined)
			?? { trust: 'trusted', allowJs: true, sandboxOrigin: undefined };
		const sanitisedContent = sanitizeSandboxContent(rawContent, policy);

		// SPEC-081: build the rf-sandbox element + its SSR fallback / source
		// templates here (deterministic from the parsed content + security
		// policy), not in a postTransform.

		// Static SSR fallback — sanitised so the page never serializes
		// would-be-executable content; lives in an inert <template>.
		const fallbackPre = sanitisedContent ? new Tag('pre', { 'data-language': 'html' }, [
			new Tag('code', { 'data-language': 'html' }, [sanitisedContent])
		]) : undefined;

		// Directory-mode source origins → a labelled list the client uses to
		// title the source panels (the panels themselves are built client-side).
		const sourceOrigins = sourcePanels
			.filter(p => p.origin)
			.map(p => `${p.label}\t${p.origin}`);

		const children: InstanceType<typeof Tag>[] = [];
		if (fallbackPre) {
			children.push(new Tag('template', { 'data-content': 'fallback' }, [fallbackPre]));
		}
		children.push(new Tag('template', { 'data-content': 'source' }, [sanitisedContent]));

		const el = createComponentRenderable({ rune: 'sandbox',
			tag: 'div',
			children,
		});
		// Emit as the rf-sandbox custom element; the renderer reads its config off
		// these data-* attributes (no field-metas).
		el.name = 'rf-sandbox';
		Object.assign(el.attributes, {
			'data-source-content': sanitisedContent,
			...(framework ? { 'data-framework': framework } : {}),
			...(dependencies ? { 'data-dependencies': dependencies } : {}),
			...(label ? { 'data-label': label } : {}),
			'data-height': height != null ? String(height) : 'auto',
			...(sourceOrigins.length > 0 ? { 'data-source-origins': sourceOrigins.join('\n') } : {}),
			'data-security-mode': policy.trust,
			'data-allow-js': policy.allowJs ? 'true' : 'false',
			...(policy.sandboxOrigin ? { 'data-sandbox-origin': policy.sandboxOrigin } : {}),
			// SPEC-093 — the query for the postProcess data resolver to evaluate.
			...(dataQuery ? {
				'data-rf-query': dataQuery,
				...(dataFields ? { 'data-rf-fields': dataFields } : {}),
				...(dataShape ? { 'data-rf-shape': dataShape } : {}),
				...(dataLimit != null ? { 'data-rf-limit': String(dataLimit) } : {}),
			} : {}),
		});
		return el;
	},
});
