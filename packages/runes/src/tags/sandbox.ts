import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

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

		const childNodes = [
			contentMeta,
			frameworkMeta,
			dependenciesMeta,
			...(labelMeta ? [labelMeta] : []),
			heightMeta,
			...(fallbackPre ? [fallbackPre] : []),
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
