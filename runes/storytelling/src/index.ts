import type { RunePackage } from '@refrakt-md/types';
import { character, characterSection } from './tags/character.js';
import { realm, realmSection } from './tags/realm.js';
import { faction, factionSection } from './tags/faction.js';
import { lore } from './tags/lore.js';
import { plot, beat } from './tags/plot.js';
import { bond } from './tags/bond.js';
import { storyboard, storyboardPanel } from './tags/storyboard.js';
import { config } from './config.js';

export const storytelling: RunePackage = {
  name: 'storytelling',
  displayName: 'Storytelling',
  version: '0.6.0',
  runes: {
    'character': {
      transform: character,
      aliases: ['npc', 'pc'],
      description: 'Character profile with portrait, role, status, and sectioned details. Headings become sections.',
      seoType: 'Person',
      reinterprets: { heading: 'character detail section', paragraph: 'description', image: 'portrait', list: 'traits or inventory' },
    },
    'character-section': {
      transform: characterSection,
      description: 'Individual section within a character profile',
    },
    'realm': {
      transform: realm,
      aliases: ['location', 'place'],
      description: 'Location or realm description with scene image, scale, and sectioned details. Headings become sections.',
      seoType: 'Place',
      reinterprets: { heading: 'realm detail section', paragraph: 'description', image: 'scene image', list: 'features or inhabitants' },
    },
    'realm-section': {
      transform: realmSection,
      description: 'Individual section within a realm description',
    },
    'faction': {
      transform: faction,
      aliases: ['guild', 'order'],
      description: 'Faction or organization within a story world with alignment, size, and sectioned details.',
      seoType: 'Organization',
      reinterprets: { heading: 'faction detail section', paragraph: 'description', list: 'members or resources' },
    },
    'faction-section': {
      transform: factionSection,
      description: 'Individual section within a faction description',
    },
    'lore': {
      transform: lore,
      aliases: ['legend', 'myth'],
      description: 'Lore entry for world-building details, legends, or historical records. Supports spoiler mode.',
      seoType: 'Article',
      reinterprets: { heading: 'lore title', paragraph: 'content', blockquote: 'in-world quote' },
    },
    'plot': {
      transform: plot,
      aliases: ['storyline', 'arc'],
      description: 'Plot arc with sequential beats. Lists with [x]/[>]/[ ]/[-] markers become beat checkpoints.',
      seoType: 'CreativeWork',
      reinterprets: { heading: 'plot title', paragraph: 'summary', list: 'beat checkpoints (with status markers)' },
    },
    'beat': {
      transform: beat,
      description: 'Individual plot beat within a plot arc',
    },
    'bond': {
      transform: bond,
      aliases: ['relationship'],
      description: 'Relationship between two named entities with type, status, and directional indicator.',
      reinterprets: { paragraph: 'relationship description' },
    },
    'storyboard': {
      transform: storyboard,
      aliases: ['comic'],
      description: 'Comic/storyboard layout where images become panels and paragraphs become captions',
      reinterprets: { image: 'panel visual', paragraph: 'caption/dialogue' },
    },
    'storyboard-panel': {
      transform: storyboardPanel,
      description: 'Individual panel within a storyboard',
    },
  },
  theme: {
    runes: config as unknown as Record<string, Record<string, unknown>>,
  },
};

export default storytelling;
