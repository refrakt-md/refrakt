import { useSchema } from '@refrakt-md/types';
import { Recipe, RecipeComponent, RecipeIngredient, RecipeIngredientComponent } from './schema/recipe.js';
import { HowTo, HowToComponent } from './schema/howto.js';

export const schema = {
  Recipe: useSchema(Recipe).defineType<RecipeComponent>('Recipe'),
  RecipeIngredient: useSchema(RecipeIngredient).defineType<RecipeIngredientComponent>('RecipeIngredient'),
  HowTo: useSchema(HowTo).defineType<HowToComponent>('HowTo'),
};
