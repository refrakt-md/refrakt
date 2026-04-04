import type { BaseComponentProps } from '@refrakt-md/types';

export interface PreviewProps<R = unknown> extends BaseComponentProps<R> {
	title?: string;
	theme?: string;
	responsive?: string;
	source?: R;
	'html-source'?: R;
}

export interface SpacingProps<R = unknown> extends BaseComponentProps<R> {
	title?: string;
}

export interface SwatchProps<R = unknown> extends BaseComponentProps<R> {
	color?: string;
	label?: string;
	showValue?: string;
	chip?: R;
	value?: R;
}

export interface TypographyProps<R = unknown> extends BaseComponentProps<R> {
	title?: string;
	showSizes?: string;
	showWeights?: string;
	showCharset?: string;
}

export interface DesignContextProps<R = unknown> extends BaseComponentProps<R> {
	title?: string;
	tokens?: string;
	scope?: string;
	sections?: R;
}

export interface MockupProps<R = unknown> extends BaseComponentProps<R> {
	device?: string;
	color?: string;
	statusBar?: string;
	label?: string;
	url?: string;
	scale?: string;
	fit?: string;
	viewport?: R;
}

export interface PaletteProps<R = unknown> extends BaseComponentProps<R> {
	title?: string;
	showContrast?: string;
	showA11y?: string;
	columns?: string;
}
