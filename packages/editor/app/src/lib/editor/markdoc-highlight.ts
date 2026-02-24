import {
	ViewPlugin,
	Decoration,
	type DecorationSet,
	type EditorView,
	type ViewUpdate,
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import type { Extension } from '@codemirror/state';

const tagDeco = Decoration.mark({ class: 'cm-markdoc-tag' });
const bracketDeco = Decoration.mark({ class: 'cm-markdoc-bracket' });
const nameDeco = Decoration.mark({ class: 'cm-markdoc-name' });

// Matches: {% tagname ... %}, {% /tagname %}, {% tagname ... /%}
const TAG_RE = /\{%\s*(\/?)(\w[\w-]*)((?:\s+[^%]*)?)(\/?)\s*%\}/g;

function buildDecorations(view: EditorView): DecorationSet {
	const ranges: { from: number; to: number; deco: Decoration }[] = [];

	for (const { from, to } of view.visibleRanges) {
		const text = view.state.doc.sliceString(from, to);
		TAG_RE.lastIndex = 0;

		let match: RegExpExecArray | null;
		while ((match = TAG_RE.exec(text)) !== null) {
			const start = from + match.index;
			const end = start + match[0].length;

			ranges.push({ from: start, to: end, deco: tagDeco });
			ranges.push({ from: start, to: start + 2, deco: bracketDeco });
			ranges.push({ from: end - 2, to: end, deco: bracketDeco });

			const slash = match[1];
			const name = match[2];
			const nameOffset = match[0].indexOf(slash + name, 2);
			const nameStart = start + nameOffset + slash.length;
			ranges.push({ from: nameStart, to: nameStart + name.length, deco: nameDeco });
		}
	}

	ranges.sort((a, b) => a.from - b.from || a.to - b.to);

	const builder = new RangeSetBuilder<Decoration>();
	for (const r of ranges) {
		builder.add(r.from, r.to, r.deco);
	}
	return builder.finish();
}

const markdocPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildDecorations(view);
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = buildDecorations(update.view);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/**
 * Creates a CodeMirror extension that highlights Markdoc tag syntax.
 * Adds visual decoration to `{% tagname %}` and `{% /tagname %}` blocks.
 */
export function markdocHighlight(): Extension {
	return markdocPlugin;
}
