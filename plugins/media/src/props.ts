import type { BaseComponentProps, PageSectionSlots, SplitLayoutProperties } from '@refrakt-md/types';

export interface TrackProps<R = unknown> extends BaseComponentProps<R> {
	name?: string;
	artist?: string;
	duration?: string;
	url?: string;
	position?: string;
	datePublished?: string;
	type?: string;
}

export interface AudioProps<R = unknown> extends BaseComponentProps<R> {
	waveform?: string;
}

export interface PlaylistProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R>, SplitLayoutProperties {
	type?: string;
	artist?: string;
	id?: string;
	track?: string;
	content?: R;
	media?: R;
}
