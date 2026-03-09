import {useSchema} from '@refrakt-md/types';
import {StorySection} from './schema/story-section.js';
import {Character} from './schema/character.js';
import {Realm} from './schema/realm.js';
import {Faction} from './schema/faction.js';
import {Lore} from './schema/lore.js';
import {Plot, Beat} from './schema/plot.js';
import {Bond} from './schema/bond.js';
import {Storyboard, StoryboardPanel} from './schema/storyboard.js';

export const schema = {
  Character: useSchema(Character).defineType('Character', {}, 'Person'),
  CharacterSection: useSchema(StorySection).defineType('CharacterSection'),
  Realm: useSchema(Realm).defineType('Realm', {}, 'Place'),
  RealmSection: useSchema(StorySection).defineType('RealmSection'),
  Faction: useSchema(Faction).defineType('Faction', {}, 'Organization'),
  FactionSection: useSchema(StorySection).defineType('FactionSection'),
  Lore: useSchema(Lore).defineType('Lore', {}, 'Article'),
  Plot: useSchema(Plot).defineType('Plot', {}, 'CreativeWork'),
  Beat: useSchema(Beat).defineType('Beat'),
  Bond: useSchema(Bond).defineType('Bond'),
  Storyboard: useSchema(Storyboard).defineType('Storyboard'),
  StoryboardPanel: useSchema(StoryboardPanel).defineType('StoryboardPanel'),
};
