import Markdoc from '@markdoc/markdoc';
import type { Node } from '@markdoc/markdoc';
import { parse } from '@refrakt-md/runes';
import { parseAttribution } from './tags/testimonial.js';

/**
 * SPEC-161 D1 — the composed `testimonial` takes its author as attributes:
 *
 * ```md
 * {% testimonial %}                      {% testimonial author="Sarah Chen" role="Head of Content" %}
 * > Quote.                         →     > Quote.
 *
 * **Sarah Chen** — Head of Content       {% /testimonial %}
 * {% /testimonial %}
 * ```
 *
 * The paragraph is read by the plugin's own `parseAttribution`, so a page means
 * after the rewrite exactly what the plugin made of it before. Only the source
 * lines involved change: the opening tag gains the attributes, and the paragraph
 * (with one blank line beside it) is removed.
 */

/** The tag names the rune answers to. */
const NAMES = new Set(['testimonial', 'review']);

export interface TestimonialMigration {
	output: string;
	/** Testimonials rewritten. */
	count: number;
	/** Testimonials left alone, and why: an attribution already given as
	 *  attributes, or none to move. */
	skipped: Array<{ line: number; reason: string }>;
}

export function migrateTestimonialAttribution(source: string): TestimonialMigration {
	const lines = source.split('\n');
	const edits: Array<{ open: number; attrs: string; remove: [number, number] }> = [];
	const skipped: TestimonialMigration['skipped'] = [];

	const visit = (node: Node) => {
		if (node.type === 'tag' && node.tag && NAMES.has(node.tag) && node.lines?.length) {
			const open = node.lines[0];
			if (node.attributes.author !== undefined) {
				skipped.push({ line: open + 1, reason: 'already has an `author` attribute' });
			} else {
				const paragraph = node.children.find(
					(c) => c.type === 'paragraph' && attributionOf(c) !== undefined,
				);
				if (!paragraph?.lines?.length) {
					skipped.push({ line: open + 1, reason: 'no `**Name** — Role` paragraph' });
				} else {
					const { name, role } = attributionOf(paragraph)!;
					const attrs = ` author="${escape(name)}"${role ? ` role="${escape(role)}"` : ''}`;
					edits.push({ open, attrs, remove: [paragraph.lines[0], paragraph.lines.at(-1)!] });
				}
			}
		}
		for (const child of node.children ?? []) visit(child);
	};
	visit(parse(source));

	// Last edit first, so earlier line numbers stay valid.
	for (const edit of [...edits].sort((a, b) => b.open - a.open)) {
		let [from, to] = edit.remove;
		// The paragraph's lines, and one blank line beside it.
		if (lines[to]?.trim() === '' && to < lines.length) to++;
		else if (lines[from - 1]?.trim() === '') from--;
		lines.splice(from, to - from);
		lines[edit.open] = lines[edit.open].replace(/\s*(-?%\})/, `${edit.attrs} $1`);
	}
	return { output: lines.join('\n'), count: edits.length, skipped };
}

/** The attribution a paragraph node carries, read as the plugin reads it. */
function attributionOf(paragraph: Node) {
	const rendered = Markdoc.transform(paragraph);
	return Markdoc.Tag.isTag(rendered) ? parseAttribution(rendered) : undefined;
}

const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
