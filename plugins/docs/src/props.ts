import type { BaseComponentProps, PageSectionSlots } from '@refrakt-md/types';

export interface ApiProps<R = unknown> extends BaseComponentProps<R> {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
	path?: string;
	auth?: string;
	body?: R;
}

export interface ChangelogReleaseProps<R = unknown> extends BaseComponentProps<R> {
	date?: string;
	version?: R;
	body?: R;
}

export interface ChangelogProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R> {
	project?: string;
	release?: string;
	releases?: R;
}

export interface SymbolMemberProps<R = unknown> extends BaseComponentProps<R> {
	name?: R;
	body?: R;
}

export interface SymbolGroupProps<R = unknown> extends BaseComponentProps<R> {
	label?: R;
	body?: R;
}

export interface SymbolProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R> {
	kind?: 'function' | 'class' | 'interface' | 'type' | 'enum' | 'variable' | 'method' | 'property' | 'event' | 'hook' | 'component' | 'module';
	lang?: string;
	since?: string;
	deprecated?: string;
	source?: string;
	body?: R;
}
