import type { Plugin } from '@refrakt-md/types';
import { howto } from './tags/howto.js';
import { recipe } from './tags/recipe.js';
import { config } from './config.js';

export const learning: Plugin = {
  name: 'learning',
  displayName: 'Learning',
  version: '0.24.0',
  runes: {
    'howto': {
      transform: howto,
      aliases: ['how-to'],
      description: 'Step-by-step how-to guide with tools/materials list and instructions',
      seoType: 'HowTo',
      category: 'Semantic',
      snippet: ['{% howto difficulty="${1|easy,medium,hard|}" %}', '# ${2:How to Do Something}', '', '- ${3:Tool or material needed}', '', '1. ${4:First step}', '2. ${5:Second step}', '{% /howto %}'],
      fixture: `{% howto estimatedTime="PT45M" difficulty="easy" %}
# Set Up a Refrakt Theme

- Node.js 20+
- A code editor
- Basic CSS knowledge

1. Create a new directory for your theme
2. Run \`npm init\` and add the theme-base dependency
3. Create your \`theme.config.ts\` extending baseConfig
4. Write CSS targeting the BEM selectors from \`refrakt inspect\`
5. Test with \`refrakt inspect --serve\`
{% /howto %}`,
    },
    'recipe': {
      transform: recipe,
      description: 'Recipe with ingredients, steps, and chef tips. Supports media-first layouts via media-position. Lists become ingredients, ordered lists become steps, blockquotes become tips.',
      seoType: 'Recipe',
      category: 'Semantic',
      snippet: ['{% recipe prepTime="${1:15m}" cookTime="${2:30m}" servings=${3:4} difficulty="${4|easy,medium,hard|}" %}', '# ${5:Recipe Name}', '', '- ${6:Ingredient one}', '- ${7:Ingredient two}', '', '1. ${8:Step one}', '2. ${9:Step two}', '{% /recipe %}'],
      fixture: `{% recipe prepTime="PT15M" cookTime="PT30M" servings="4" difficulty="medium" media-position="end" %}
![Classic Margherita Pizza](placeholder:cover)

---

Quick weeknight classic

# Classic Margherita Pizza

A timeless Italian favorite with a crispy crust and fresh toppings.

- 500g bread flour
- 7g dried yeast
- 1 tsp salt
- 300ml warm water
- San Marzano tomatoes
- Fresh mozzarella
- Fresh basil leaves

1. Mix flour, yeast, and salt in a large bowl
2. Add warm water and knead for 10 minutes until smooth
3. Let the dough rise for 1 hour at room temperature
4. Shape into rounds and add toppings
5. Bake at 250°C for 8-10 minutes

> For the best crust, preheat your oven with a pizza stone for at least 30 minutes before baking.
{% /recipe %}`,
    },
  },
  theme: {
    runes: config as unknown as Record<string, Record<string, unknown>>,
  },
};

export default learning;

export type { RecipeProps, HowtoProps } from './props.js';
