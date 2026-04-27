/**
 * Generic component override prop interfaces for core runes (ADR-008, Approach B).
 *
 * Usage in Svelte 5:
 * ```ts
 * import type { Snippet } from 'svelte';
 * import type { HintProps } from '@refrakt-md/runes';
 * let { hintType, body, children, tag }: HintProps<Snippet> = $props();
 * ```
 *
 * @module
 */
import type { BaseComponentProps, PageSectionSlots } from '@refrakt-md/types';

// ─── Accordion ───────────────────────────────────────────────────────

export interface AccordionItemProps<R = unknown> extends BaseComponentProps<R> {
	name?: string;
	schemaOrgType?: string;
	body?: R;
}

export interface AccordionProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R> {
	item?: string;
	schemaOrgType?: string;
	items?: R;
}

// ─── Annotate ────────────────────────────────────────────────────────

export interface AnnotateNoteProps<R = unknown> extends BaseComponentProps<R> {
	body?: R;
}

export interface AnnotateProps<R = unknown> extends BaseComponentProps<R> {
	note?: string;
	variant?: string;
	body?: R;
}

// ─── Blog ────────────────────────────────────────────────────────────

export interface BlogProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R> {
	folder?: string;
	sort?: string;
	filter?: string;
	limit?: string;
	layout?: string;
	posts?: R;
}

// ─── Breadcrumb ──────────────────────────────────────────────────────

export interface BreadcrumbItemProps<R = unknown> extends BaseComponentProps<R> {
	name?: string;
	url?: string;
}

export interface BreadcrumbProps<R = unknown> extends BaseComponentProps<R> {
	separator?: string;
	items?: R;
}

// ─── Budget ──────────────────────────────────────────────────────────

export interface BudgetLineItemProps<R = unknown> extends BaseComponentProps<R> {
	description?: string;
	amount?: string;
}

export interface BudgetCategoryProps<R = unknown> extends BaseComponentProps<R> {
	label?: string;
	estimate?: string;
	lineItem?: string;
	subtotal?: string;
	'line-items'?: R;
}

export interface BudgetProps<R = unknown> extends BaseComponentProps<R> {
	title?: string;
	currency?: string;
	duration?: string;
	showPerDay?: string;
	variant?: string;
	category?: string;
	categories?: R;
}

// ─── Chart ───────────────────────────────────────────────────────────

export interface ChartProps<R = unknown> extends BaseComponentProps<R> {
	type?: string;
	title?: string;
	stacked?: string;
	data?: R;
}

// ─── Code Group ──────────────────────────────────────────────────────

export interface CodeGroupProps<R = unknown> extends BaseComponentProps<R> {
	title?: string;
	overflow?: string;
	tabs?: R;
	panels?: R;
	panel?: R;
}

// ─── Compare ─────────────────────────────────────────────────────────

export interface CompareProps<R = unknown> extends BaseComponentProps<R> {
	layout?: string;
	panels?: R;
}

// ─── Conversation ────────────────────────────────────────────────���───

export interface ConversationMessageProps<R = unknown> extends BaseComponentProps<R> {
	speaker?: string;
	align?: string;
	body?: R;
}

export interface ConversationProps<R = unknown> extends BaseComponentProps<R> {
	message?: string;
	messages?: R;
}

// ─── DataTable ───────────────────────────────────────────────────────

export interface DataTableProps<R = unknown> extends BaseComponentProps<R> {
	sortable?: string;
	searchable?: string;
	pageSize?: string;
	defaultSort?: string;
	table?: R;
}

// ─── Details ─────────────────────────────────────────────────────────

export interface DetailsProps<R = unknown> extends BaseComponentProps<R> {
	summary?: string;
	body?: R;
}

// ─── Diagram ─────────────────────────────────────────────────────────

export interface DiagramProps<R = unknown> extends BaseComponentProps<R> {
	language?: string;
	title?: string;
	source?: R;
}

// ─── Diff ────────────────────────────────────────────────────────────

export interface DiffProps<R = unknown> extends BaseComponentProps<R> {
	mode?: string;
	language?: string;
}

// ─── Embed ───────────────────────────────────────────────────────────

export interface EmbedProps<R = unknown> extends BaseComponentProps<R> {
	url?: string;
	type?: string;
	aspect?: string;
	title?: string;
	embedUrl?: string;
	provider?: string;
	fallback?: R;
}

// ─── Error ───────────────────────────────────────────────────────────

export interface ErrorProps<R = unknown> extends BaseComponentProps<R> {
	code?: string;
	errorTag?: string;
	level?: string;
	message?: string;
}

// ─── Figure ──────────────────────────────────────────────────────────

export interface FigureProps<R = unknown> extends BaseComponentProps<R> {
	size?: string;
	align?: string;
	caption?: R;
}

// ─── Form ────────────────────────────────────────────────────────────

export interface FormProps<R = unknown> extends BaseComponentProps<R> {
	action?: string;
	method?: string;
}

// ─── Gallery ─────────────────────────────────────────────────────────

export interface GalleryProps<R = unknown> extends BaseComponentProps<R> {
	layout?: string;
	lightbox?: string;
	columns?: string;
	gap?: string;
	caption?: string;
}

// ─── Grid ────────────────────────────────────────────────────────────

export interface GridProps<R = unknown> extends BaseComponentProps<R> {
	mode?: string;
	ratio?: string;
	gap?: string;
	valign?: string;
	collapse?: string;
	min?: string;
	aspect?: string;
	stack?: string;
	cell?: R;
}

// ─── Hint ────────────────────────────────────────────────────────────

export interface HintProps<R = unknown> extends BaseComponentProps<R> {
	hintType?: 'info' | 'warning' | 'danger' | 'success' | 'note';
	body?: R;
}

// ─── Juxtapose ───────────────────────────────────────────────────────

export interface JuxtaposePanelProps<R = unknown> extends BaseComponentProps<R> {
	name?: string;
	body?: R;
}

export interface JuxtaposeProps<R = unknown> extends BaseComponentProps<R> {
	panel?: string;
	variant?: string;
	orientation?: string;
	position?: string;
	duration?: string;
	panels?: R;
}

// ─── MediaText ───────────────────────────────────────────────────────

export interface MediaTextProps<R = unknown> extends BaseComponentProps<R> {
	align?: string;
	ratio?: string;
	wrap?: string;
	media?: R;
	body?: R;
}

// ─── Nav ─────────────────────────────────────────────────────────────

export interface NavItemProps<R = unknown> extends BaseComponentProps<R> {
	slug?: string;
}

export interface NavGroupProps<R = unknown> extends BaseComponentProps<R> {
	title?: string;
	item?: string;
}

export interface NavProps<R = unknown> extends BaseComponentProps<R> {
	group?: string;
	item?: string;
}

// ─── PullQuote ───────────────────────────────────────────────────────

export interface PullQuoteProps<R = unknown> extends BaseComponentProps<R> {
	align?: string;
	variant?: string;
}

// ─── Reveal ──────────────────────────────────────────────────────────

export interface RevealStepProps<R = unknown> extends BaseComponentProps<R> {
	name?: string;
	body?: R;
}

export interface RevealProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R> {
	step?: string;
	steps?: R;
}

// ─── Sandbox ─────────────────────────────────────────────────────────

export interface SandboxProps<R = unknown> extends BaseComponentProps<R> {
	content?: string;
	framework?: string;
	dependencies?: string;
	label?: string;
	height?: string;
	context?: string;
}

// ─── Showcase ────────────────────────────────────────────────────────

export interface ShowcaseProps<R = unknown> extends BaseComponentProps<R> {
	shadow?: string;
	bleed?: string;
	offset?: string;
	aspect?: string;
	place?: string;
	viewport?: R;
}

// ─── Sidenote ────────────────────────────────────────────────────────

export interface SidenoteProps<R = unknown> extends BaseComponentProps<R> {
	variant?: string;
	body?: R;
}

// ─── Tabs ────────────────────────────────────────────────────────────

export interface TabProps<R = unknown> extends BaseComponentProps<R> {
	image?: string;
	name?: R;
}

export interface TabPanelProps<R = unknown> extends BaseComponentProps<R> {}

export interface TabGroupProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R> {
	tabs?: R;
	panels?: R;
}

// ─── TextBlock ───────────────────────────────────────────────────────

export interface TextBlockProps<R = unknown> extends BaseComponentProps<R> {
	dropcap?: string;
	columns?: string;
	lead?: string;
	align?: string;
	body?: R;
}

// ─── Table of Contents ───────────────────────────────────────────────

export interface TableOfContentsProps<R = unknown> extends BaseComponentProps<R> {
	depth?: string;
	ordered?: string;
	list?: R;
}
