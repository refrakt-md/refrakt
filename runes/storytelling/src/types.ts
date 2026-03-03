import { useSchema } from '@refrakt-md/types';
import { StorySection, StorySectionComponent } from './schema/story-section.js';
import { Character, CharacterComponent } from './schema/character.js';
import { Realm, RealmComponent } from './schema/realm.js';
import { Faction, FactionComponent } from './schema/faction.js';
import { Lore, LoreComponent } from './schema/lore.js';
import { Plot, PlotComponent, Beat, BeatComponent } from './schema/plot.js';
import { Bond, BondComponent } from './schema/bond.js';
import { Storyboard, StoryboardComponent, StoryboardPanel, StoryboardPanelComponent } from './schema/storyboard.js';

export const schema = {
  Character: useSchema(Character).defineType<CharacterComponent>('Character'),
  CharacterSection: useSchema(StorySection).defineType<StorySectionComponent>('CharacterSection'),
  Realm: useSchema(Realm).defineType<RealmComponent>('Realm'),
  RealmSection: useSchema(StorySection).defineType<StorySectionComponent>('RealmSection'),
  Faction: useSchema(Faction).defineType<FactionComponent>('Faction'),
  FactionSection: useSchema(StorySection).defineType<StorySectionComponent>('FactionSection'),
  Lore: useSchema(Lore).defineType<LoreComponent>('Lore'),
  Plot: useSchema(Plot).defineType<PlotComponent>('Plot'),
  Beat: useSchema(Beat).defineType<BeatComponent>('Beat'),
  Bond: useSchema(Bond).defineType<BondComponent>('Bond'),
  Storyboard: useSchema(Storyboard).defineType<StoryboardComponent>('Storyboard'),
  StoryboardPanel: useSchema(StoryboardPanel).defineType<StoryboardPanelComponent>('StoryboardPanel'),
};
