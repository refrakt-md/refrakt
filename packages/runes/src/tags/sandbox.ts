import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { assembleFromDirectory, mergeContent, type SandboxSourcePanel } from '../sandbox-sources.js';

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

class SandboxModel extends Model {
	@attribute({ type: String, required: false, description: 'Directory containing external source files' })
	src: string = '';

	@attribute({ type: String, required: false, description: 'JavaScript framework for the sandbox' })
	framework: string = '';

	@attribute({ type: String, required: false, description: 'Comma-separated npm packages to include' })
	dependencies: string = '';

	@attribute({ type: String, required: false, description: 'Label displayed above the sandbox' })
	label: string = '';

	@attribute({ type: Number, required: false, description: 'Height of the sandbox iframe in pixels' })
	height: number | undefined;

	@attribute({ type: String, required: false, description: 'Shared context scope for multiple sandboxes' })
	context: string = 'default';

	/** Extract raw inline content from the markdown source using line ranges. */
	private extractInlineContent(): string {
		const raw = this.config.variables?.__source;
		if (typeof raw === 'string' && this.node.lines?.length >= 2) {
			const allLines = raw.split('\n');
			const start = this.node.lines[0] + 1;
			const end = this.node.lines[this.node.lines.length - 1] - 1;
			return allLines.slice(start, end).join('\n').trim();
		}
		return '';
	}

	transform(): RenderableTreeNodes {
		let rawContent = '';
		let sourcePanels: SourcePanel[] = [];

		const readFile = this.config.variables?.__sandboxReadFile as ((p: string) => string | null) | undefined;
		const listDir = this.config.variables?.__sandboxListDir as ((p: string) => string[]) | undefined;
		const dirExists = this.config.variables?.__sandboxDirExists as ((p: string) => boolean) | undefined;
		const examplesDir = this.config.variables?.__sandboxExamplesDir as string | undefined;

		if (this.src && readFile && listDir && examplesDir) {
			// Directory source mode
			const dirPath = examplesDir.endsWith('/') ? examplesDir + this.src : examplesDir + '/' + this.src;
			const result = assembleFromDirectory(dirPath, this.src, readFile, listDir, dirExists);

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
			const inlineContent = this.extractInlineContent();
			if (inlineContent) {
				rawContent = mergeContent(rawContent, inlineContent);
				// Re-extract panels from merged content
				sourcePanels = extractDataSourcePanels(rawContent);
			}
		} else {
			// Existing inline extraction
			rawContent = this.extractInlineContent();
			sourcePanels = extractDataSourcePanels(rawContent);
		}

		const contentMeta = new Tag('meta', { content: rawContent });
		const frameworkMeta = new Tag('meta', { content: this.framework });
		const dependenciesMeta = new Tag('meta', { content: this.dependencies });
		const labelMeta = this.label ? new Tag('meta', { content: this.label }) : undefined;
		const heightMeta = new Tag('meta', { content: this.height != null ? String(this.height) : 'auto' });
		const contextMeta = new Tag('meta', { content: this.context });

		// Static fallback: render content as a pre/code block for SSR
		const fallbackPre = rawContent ? new Tag('pre', { 'data-language': 'html' }, [
			new Tag('code', { 'data-language': 'html' }, [rawContent])
		]) : undefined;

		// Source panels for server-side syntax highlighting
		const panelNodes = sourcePanels.map(panel => {
			const pre = new Tag('pre', { 'data-language': panel.language }, [
				new Tag('code', { 'data-language': panel.language }, [panel.content])
			]);
			return new Tag('meta', {
				'data-field': 'source-panel',
				'data-label': panel.label,
				...(panel.origin ? { 'data-origin': panel.origin } : {}),
			}, [pre]);
		});

		const childNodes = [
			contentMeta,
			frameworkMeta,
			dependenciesMeta,
			...(labelMeta ? [labelMeta] : []),
			heightMeta,
			contextMeta,
			...(fallbackPre ? [fallbackPre] : []),
			...panelNodes,
		];

		return createComponentRenderable(schema.Sandbox, {
			tag: 'div',
			properties: {
				content: contentMeta,
				framework: frameworkMeta,
				dependencies: dependenciesMeta,
				...(labelMeta ? { label: labelMeta } : {}),
				height: heightMeta,
				context: contextMeta,
			},
			children: childNodes,
		});
	}
}

export const sandbox = createSchema(SandboxModel);
