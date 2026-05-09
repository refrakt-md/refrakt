import type { BaseComponentProps, PageSectionSlots, SplitLayoutProperties } from '@refrakt-md/types';

export interface FeatureProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R>, SplitLayoutProperties {
	align?: string;
	'feature-item'?: R;
	content?: R;
	media?: R;
}

export interface CtaProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R> {
	actions?: R;
	body?: R;
	action?: R;
	command?: R;
}

export interface StepProps<R = unknown> extends BaseComponentProps<R>, SplitLayoutProperties {
	name?: string;
	content?: R;
	media?: R;
}

export interface StepsProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R> {
	step?: string;
}

export interface TierProps<R = unknown> extends BaseComponentProps<R> {
	description?: string;
	currency?: string;
	url?: string;
	body?: R;
	name?: R;
	price?: R;
}

export interface PricingProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R> {
	tier?: string;
	tiers?: R;
}

export interface ComparisonRowProps<R = unknown> extends BaseComponentProps<R> {
	rowType?: string;
	body?: R;
	label?: R;
}

export interface ComparisonColumnProps<R = unknown> extends BaseComponentProps<R> {
	highlighted?: string;
	row?: string;
	body?: R;
	name?: R;
}

export interface ComparisonProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R> {
	layout?: string;
	labels?: string;
	collapse?: string;
	verdict?: string;
	highlighted?: string;
	rowLabels?: string;
	column?: string;
	grid?: R;
}

export interface HeroProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R>, SplitLayoutProperties {
	align?: string;
	actions?: R;
	content?: R;
	media?: R;
	action?: R;
	command?: R;
}

export interface BentoCellProps<R = unknown> extends BaseComponentProps<R> {
	name?: string;
	size?: string;
	span?: string;
	iconSource?: string;
	body?: R;
	icon?: R;
}

export interface BentoProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R> {
	gap?: string;
	columns?: string;
	sizing?: string;
	cell?: string;
	grid?: R;
}

export interface TestimonialProps<R = unknown> extends BaseComponentProps<R> {
	rating?: string;
	quote?: R;
	'author-name'?: R;
	'author-role'?: R;
	avatar?: R;
}
