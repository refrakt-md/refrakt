import type { RunePackage } from '@refrakt-md/types';
import { howto } from './tags/howto.js';
import { recipe } from './tags/recipe.js';
import { config } from './config.js';

export const learning: RunePackage = {
  name: 'learning',
  displayName: 'Learning',
  version: '0.8.4',
  runes: {
    'howto': {
      transform: howto,
      aliases: ['how-to'],
      description: 'Step-by-step how-to guide with tools/materials list and instructions',
      seoType: 'HowTo',
      reinterprets: { 'ordered list': 'steps', list: 'tools/materials', heading: 'title' },
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
      description: 'Recipe with ingredients, steps, and chef tips. Supports split layout with media zone. Lists become ingredients, ordered lists become steps, blockquotes become tips.',
      seoType: 'Recipe',
      reinterprets: { list: 'ingredients', 'ordered list': 'steps', blockquote: 'chef tips', image: 'recipe photo', heading: 'recipe name', 'horizontal rule': 'content/media separator' },
      fixture: `{% recipe prepTime="PT15M" cookTime="PT30M" servings="4" difficulty="medium" layout="split" %}
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

---

![Classic Margherita Pizza](./pizza.jpg)
{% /recipe %}`,
    },
  },
  theme: {
    runes: config as unknown as Record<string, Record<string, unknown>>,
  },
};

export default learning;
