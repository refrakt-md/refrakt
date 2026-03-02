import type { RunePackage } from '@refrakt-md/types';
import { howto } from './tags/howto.js';
import { recipe } from './tags/recipe.js';
import { config } from './config.js';

export const learning: RunePackage = {
  name: 'learning',
  displayName: 'Learning',
  version: '0.6.0',
  runes: {
    'howto': {
      transform: howto,
      aliases: ['how-to'],
      description: 'Step-by-step how-to guide with tools/materials list and instructions',
      seoType: 'HowTo',
      reinterprets: { 'ordered list': 'steps', list: 'tools/materials', heading: 'title' },
    },
    'recipe': {
      transform: recipe,
      description: 'Recipe with ingredients, steps, and chef tips. Lists become ingredients, ordered lists become steps, blockquotes become tips.',
      seoType: 'Recipe',
      reinterprets: { list: 'ingredients', 'ordered list': 'steps', blockquote: 'chef tips', image: 'recipe photo', heading: 'recipe name' },
    },
  },
  theme: {
    runes: config as unknown as Record<string, Record<string, unknown>>,
  },
};

export default learning;
