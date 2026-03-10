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
  version: '0.7.2',
  runes: {
    'character': {
      transform: character,
      aliases: ['npc', 'pc'],
      description: 'Character profile with portrait, role, status, and sectioned details. Headings become sections.',
      seoType: 'Person',
      reinterprets: { heading: 'character detail section', paragraph: 'description', image: 'portrait', list: 'traits or inventory' },
      fixture: `{% character name="Veshra" role="antagonist" status="alive" aliases="The Bone Witch" tags="magic-user" %}
## Backstory

Raised in the shadow of the Ashen Spire, Veshra discovered her gift for necromancy at a young age.

## Abilities

- Bone conjuration
- Spirit binding
- Plague whisper
{% /character %}`,
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
      fixture: `{% realm name="Rivendell" type="sanctuary" scale="settlement" parent="Eriador" %}
![Scene](/images/rivendell.jpg)

The Last Homely House East of the Sea.

## Geography

A hidden valley in the foothills of the Misty Mountains.

## Notable Features

- Hall of Fire
- Council chamber
- Extensive libraries
{% /realm %}`,
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
      fixture: `{% faction name="The Silver Order" type="knightly order" alignment="lawful" size="large" %}
A prestigious order of knights sworn to protect the realm.

## Ranks

- Initiate
- Knight
- Commander
- Grand Master

## Holdings

Their fortress overlooks the capital city from the northern cliffs.
{% /faction %}`,
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
      fixture: `{% lore title="The Prophecy of the Chosen One" category="prophecy" spoiler=true %}
An ancient text found in the ruins of the First Temple.

> *When darkness covers the land and the last star fades,
> one shall rise from forgotten blood to forge the world anew.*

The prophecy has been interpreted differently by various factions throughout history.
{% /lore %}`,
    },
    'plot': {
      transform: plot,
      aliases: ['storyline', 'arc'],
      description: 'Plot arc with sequential beats. Lists with [x]/[>]/[ ]/[-] markers become beat checkpoints.',
      seoType: 'CreativeWork',
      reinterprets: { heading: 'plot title', paragraph: 'summary', list: 'beat checkpoints (with status markers)' },
      fixture: `{% plot title="The Quest for the Crown" type="quest" structure="linear" %}
The heroes must recover the lost crown before the solstice.

- [x] **Discovery** — Find the ancient map in the library
- [x] **Departure** — Leave the city under cover of darkness
- [>] **Trial** — Cross the Whispering Wastes
- [ ] **Confrontation** — Face the guardian of the vault
- [-] **Return** — Bring the crown back to the capital
{% /plot %}`,
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
      fixture: `{% bond from="Aragorn" to="Legolas" type="fellowship" status="active" %}
Forged during the Council of Elrond, their bond was tested through the
War of the Ring. Despite their different backgrounds, they developed
a deep mutual respect.
{% /bond %}`,
    },
    'storyboard': {
      transform: storyboard,
      aliases: ['comic'],
      description: 'Comic/storyboard layout where images become panels and paragraphs become captions',
      reinterprets: { image: 'panel visual', paragraph: 'caption/dialogue' },
      fixture: `{% storyboard variant="clean" columns="3" %}
![Panel 1](/images/panel1.jpg)
The hero surveys the landscape from atop the hill.

![Panel 2](/images/panel2.jpg)
A distant rumble echoes across the valley.

![Panel 3](/images/panel3.jpg)
The journey begins.
{% /storyboard %}`,
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
