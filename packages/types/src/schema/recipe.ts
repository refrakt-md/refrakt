import { ComponentType } from "../interfaces.js";
import { PageSection, PageSectionProperties } from "./page.js";

export class RecipeIngredient {
	amount: string = '';
	unit: string = '';
	name: string = '';
}

export interface RecipeIngredientComponent extends ComponentType<RecipeIngredient> {
	tag: 'li',
	properties: {
		amount: 'span',
		unit: 'span',
		name: 'span',
	},
	refs: {}
}

export class Recipe extends PageSection {
	prepTime: string = '';
	cookTime: string = '';
	servings: number | undefined = undefined;
	difficulty: string = 'medium';
}

export interface RecipeProperties extends PageSectionProperties {
	prepTime: 'meta',
	cookTime: 'meta',
	servings: 'meta',
	difficulty: 'meta',
}

export interface RecipeComponent extends ComponentType<Recipe> {
	tag: 'article',
	properties: RecipeProperties,
	refs: {
		ingredients: 'ul',
		steps: 'ol',
		tips: 'div',
	}
}
