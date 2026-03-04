import { PageSection } from "@refrakt-md/types";

export class RecipeIngredient {
	amount: string = '';
	unit: string = '';
	name: string = '';
}

export class Recipe extends PageSection {
	prepTime: string = '';
	cookTime: string = '';
	servings: number | undefined = undefined;
	difficulty: string = 'medium';
}
