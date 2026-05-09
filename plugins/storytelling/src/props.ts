import type { BaseComponentProps, SplitLayoutProperties } from '@refrakt-md/types';

export interface CharacterSectionProps<R = unknown> extends BaseComponentProps<R> {
	name?: R;
	body?: R;
}

export interface CharacterProps<R = unknown> extends BaseComponentProps<R> {
	role?: string;
	status?: string;
	aliases?: string;
	tags?: string;
	section?: string;
	name?: R;
	portrait?: R;
	sections?: R;
	body?: R;
}

export interface RealmSectionProps<R = unknown> extends BaseComponentProps<R> {
	name?: R;
	body?: R;
}

export interface RealmProps<R = unknown> extends BaseComponentProps<R>, SplitLayoutProperties {
	realmType?: string;
	scale?: string;
	tags?: string;
	parent?: string;
	section?: string;
	name?: R;
	scene?: R;
	content?: R;
	sections?: R;
}

export interface BeatProps<R = unknown> extends BaseComponentProps<R> {
	status?: string;
	id?: string;
	track?: string;
	follows?: string;
	label?: R;
	body?: R;
}

export interface PlotProps<R = unknown> extends BaseComponentProps<R> {
	plotType?: string;
	structure?: string;
	tags?: string;
	beat?: string;
	title?: R;
	beats?: R;
}

export interface BondProps<R = unknown> extends BaseComponentProps<R> {
	bondType?: string;
	status?: string;
	bidirectional?: string;
	from?: R;
	to?: R;
	connector?: R;
	body?: R;
}

export interface StoryboardPanelProps<R = unknown> extends BaseComponentProps<R> {
	image?: R;
	caption?: R;
	body?: R;
}

export interface StoryboardProps<R = unknown> extends BaseComponentProps<R> {
	panel?: string;
	variant?: string;
	columns?: string;
	panels?: R;
}

export interface LoreProps<R = unknown> extends BaseComponentProps<R> {
	category?: string;
	spoiler?: string;
	tags?: string;
	title?: R;
	body?: R;
}

export interface FactionSectionProps<R = unknown> extends BaseComponentProps<R> {
	name?: R;
	body?: R;
}

export interface FactionProps<R = unknown> extends BaseComponentProps<R>, SplitLayoutProperties {
	factionType?: string;
	alignment?: string;
	size?: string;
	tags?: string;
	section?: string;
	name?: R;
	scene?: R;
	content?: R;
	sections?: R;
}
