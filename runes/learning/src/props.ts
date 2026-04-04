import type { BaseComponentProps, PageSectionSlots, SplitLayoutProperties } from '@refrakt-md/types';

export interface RecipeProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R>, SplitLayoutProperties {
	prepTime?: string;
	cookTime?: string;
	servings?: string;
	difficulty?: 'easy' | 'medium' | 'hard';
	ingredients?: R;
	steps?: R;
	tips?: R;
	content?: R;
	media?: R;
}

export interface HowtoProps<R = unknown> extends BaseComponentProps<R>, PageSectionSlots<R> {
	estimatedTime?: string;
	difficulty?: 'easy' | 'medium' | 'hard';
	tools?: R;
	steps?: R;
}
