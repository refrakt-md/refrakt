import type { BaseComponentProps, PageSectionSlots } from '@refrakt-md/types';

export interface CastMemberProps<R = unknown> extends BaseComponentProps<R> {
	name?: R;
	role?: R;
	body?: R;
}

export interface CastProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R> {
	member?: string;
	layout?: string;
	members?: R;
}

export interface OrganizationProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R> {
	type?: string;
	body?: R;
}

export interface TimelineEntryProps<R = unknown> extends BaseComponentProps<R> {
	date?: R;
	label?: R;
	body?: R;
}

export interface TimelineProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R> {
	direction?: string;
	entry?: string;
	entries?: R;
}
