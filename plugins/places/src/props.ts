import type { BaseComponentProps, PageSectionSlots } from '@refrakt-md/types';

export interface ItineraryStopProps<R = unknown> extends BaseComponentProps<R> {
	time?: string;
	location?: string;
	duration?: string;
	activity?: string;
	lat?: string;
	lng?: string;
	body?: R;
}

export interface ItineraryDayProps<R = unknown> extends BaseComponentProps<R> {
	label?: string;
	date?: string;
	stop?: string;
	stops?: R;
}

export interface ItineraryProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R> {
	variant?: string;
	direction?: string;
	day?: string;
	days?: R;
}

export interface MapPinProps<R = unknown> extends BaseComponentProps<R> {
	lat?: string;
	lng?: string;
	address?: string;
	url?: string;
	group?: string;
	name?: R;
	description?: R;
}

export interface MapProps<R = unknown> extends BaseComponentProps<R> {
	zoom?: string;
	center?: string;
	variant?: string;
	height?: string;
	provider?: string;
	interactive?: string;
	route?: string;
	cluster?: string;
	pin?: string;
	pins?: R;
}

export interface EventProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R> {
	date?: string;
	endDate?: string;
	location?: string;
	url?: string;
	body?: R;
}
