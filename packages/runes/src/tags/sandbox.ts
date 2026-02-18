import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

/** Strip common leading whitespace from all lines. */
function dedent(text: string): string {
	const lines = text.split('\n');
	const indents = lines.filter(l => l.trim().length > 0).map(l => l.match(/^(\s*)/)?.[0].length ?? 0);
	const min = indents.length > 0 ? Math.min(...indents) : 0;
	return min > 0 ? lines.map(l => l.slice(min)).join('\n') : text;
}

interface SourcePanel { label: string; language: string; content: string; }

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
	@attribute({ type: String, required: false })
	framework: string = '';

	@attribute({ type: String, required: false })
	dependencies: string = '';

	@attribute({ type: String, required: false })
	label: string = '';

	@attribute({ type: Number, required: false })
	height: number | undefined;

	transform(): RenderableTreeNodes {
		// Extract raw content via __source + node.lines
		// This bypasses Markdoc HTML parsing entirely — Markdoc cannot
		// reliably parse <style>, <script>, or block-level HTML elements
		let rawContent = '';
		const raw = this.config.variables?.__source;
		if (typeof raw === 'string' && this.node.lines?.length >= 2) {
			const allLines = raw.split('\n');
			const start = this.node.lines[0] + 1;
			const end = this.node.lines[this.node.lines.length - 1] - 1;
			rawContent = allLines.slice(start, end).join('\n').trim();
		}

		const contentMeta = new Tag('meta', { content: rawContent });
		const frameworkMeta = new Tag('meta', { content: this.framework });
		const dependenciesMeta = new Tag('meta', { content: this.dependencies });
		const labelMeta = this.label ? new Tag('meta', { content: this.label }) : undefined;
		const heightMeta = new Tag('meta', { content: this.height != null ? String(this.height) : 'auto' });

		// Static fallback: render content as a pre/code block for SSR
		const fallbackPre = rawContent ? new Tag('pre', { 'data-language': 'html' }, [
			new Tag('code', { 'data-language': 'html' }, [rawContent])
		]) : undefined;

		// Extract data-source panels for server-side syntax highlighting
		const sourcePanels = extractDataSourcePanels(rawContent);
		const panelNodes = sourcePanels.map(panel => {
			const pre = new Tag('pre', { 'data-language': panel.language }, [
				new Tag('code', { 'data-language': panel.language }, [panel.content])
			]);
			return new Tag('meta', { property: 'source-panel', 'data-label': panel.label }, [pre]);
		});

		const childNodes = [
			contentMeta,
			frameworkMeta,
			dependenciesMeta,
			...(labelMeta ? [labelMeta] : []),
			heightMeta,
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
			},
			children: childNodes,
		});
	}
}

export const sandbox = createSchema(SandboxModel);
