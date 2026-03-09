import {useSchema} from '@refrakt-md/types';
import {Recipe, RecipeIngredient} from './schema/recipe.js';
import {HowTo} from './schema/howto.js';

export const schema = {
  Recipe: useSchema(Recipe).defineType('Recipe', {}, 'Recipe'),
  RecipeIngredient: useSchema(RecipeIngredient).defineType('RecipeIngredient'),
  HowTo: useSchema(HowTo).defineType('HowTo', {}, 'HowTo'),
};
