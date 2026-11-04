import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	bodyOnly,
	createComponentRenderable,
	renderNodes,
} from '../lib/index.js';

const displayValues = ['fraction', 'percent', 'none'] as const;
const sentimentValues = ['positive', 'caution', 'negative'] as const;

function textContent(node: unknown): string {
	if (typeof node === 'string') return node;
	if (Array.isArray(node)) return node.map(textContent).join('');
	if (Markdoc.Tag.isTag(node as never))
		return textContent((node as { children?: unknown[] }).children ?? []);
	return '';
}

export const progress = createContentModelSchema({
	attributes: {
		value: { type: Number, required: false, description: 'Completed amount (paired with `max`).' },
		max: { type: Number, required: false, description: 'Total amount (paired with `value`).' },
		percent: {
			type: Number,
			required: false,
			description: 'Direct percentage 0–100, when there is no count.',
		},
		display: {
			type: String,
			required: false,
			matches: displayValues.slice(),
			description: 'Readout: fraction (default with value/max), percent, or none.',
		},
		sentiment: {
			type: String,
			required: false,
			matches: sentimentValues.slice(),
			description: 'Tone cue: positive / caution / negative. Absent → the neutral primary fill.',
		},
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const value = attrs.value != null ? Number(attrs.value) : undefined;
		const max = attrs.max != null ? Number(attrs.max) : undefined;
		const percentAttr = attrs.percent != null ? Number(attrs.percent) : undefined;
		const clamp = (n: number) => Math.max(0, Math.min(100, n));
		const hasRatio =
			value != null &&
			max != null &&
			Number.isFinite(value) &&
			Number.isFinite(max) &&
			(max as number) > 0;
		const pct = hasRatio
			? clamp(Math.round((value! / max!) * 100))
			: percentAttr != null && Number.isFinite(percentAttr)
				? clamp(percentAttr)
				: 0;

		const display = (attrs.display as string) || (hasRatio ? 'fraction' : 'percent');
		let readout = '';
		if (display === 'fraction' && hasRatio) readout = `${value}/${max}`;
		else if (display === 'percent') readout = `${pct}%`;

		const labelNodes = renderNodes(resolved.body, config);
		const labelArr = labelNodes.toArray();
		const labelText = textContent(labelArr).trim();

		const sentiment = attrs.sentiment as string | undefined;
		const sentimentMeta = sentiment ? new Tag('meta', { content: sentiment }) : undefined;

		const fillTag = new Tag('span', {}, []);
		const trackTag = new Tag('span', {}, [fillTag]);
		const refs: Record<string, InstanceType<typeof Tag>> = { track: trackTag, fill: fillTag };
		const children: RenderableTreeNode[] = [];

		if (labelArr.length > 0) {
			const labelTag = new Tag('span', {}, labelArr);
			refs.label = labelTag;
			children.push(labelTag);
		}
		if (readout) {
			const valueTag = new Tag('span', {}, [readout]);
			refs.value = valueTag;
			children.push(valueTag);
		}
		children.push(trackTag);

		const out = createComponentRenderable({
			rune: 'progress',
			tag: 'div',
			properties: sentimentMeta ? { sentiment: sentimentMeta } : {},
			refs,
			children,
		});

		out.attributes.role = 'progressbar';
		out.attributes['aria-valuemin'] = '0';
		if (hasRatio) {
			out.attributes['aria-valuenow'] = String(value);
			out.attributes['aria-valuemax'] = String(max);
		} else {
			out.attributes['aria-valuenow'] = String(pct);
			out.attributes['aria-valuemax'] = '100';
		}
		if (labelText) out.attributes['aria-label'] = labelText;
		out.attributes.style = `--rf-progress: ${pct}%`;
		return out;
	},
});
