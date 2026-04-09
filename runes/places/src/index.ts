import type { RunePackage } from '@refrakt-md/types';
import { event } from './tags/event.js';
import { map, mapPin } from './tags/map.js';
import { itinerary, itineraryDay, itineraryStop } from './tags/itinerary.js';
import { config } from './config.js';

export const places: RunePackage = {
  name: 'places',
  displayName: 'Places',
  version: '0.9.3',
  runes: {
    'event': {
      transform: event,
      description: 'Event information with date, location, and agenda',
      seoType: 'Event',
      reinterprets: { heading: 'event name', list: 'speakers/agenda', blockquote: 'venue description', link: 'registration URL' },
      category: 'Semantic',
      snippet: ['{% event date="${1:${CURRENT_YEAR}-${CURRENT_MONTH}-${CURRENT_DATE}}" location="${2:Location}" %}', '# ${3:Event Name}', '', '${4:Event description}', '{% /event %}'],
      fixture: `{% event date="2026-03-15" endDate="2026-03-17" location="Stockholm, Sweden" url="https://example.com/register" %}
# Nordic Developer Summit

A three-day conference bringing together developers, designers, and product engineers from across the Nordics.

- Keynote: The Future of Web Components
- Workshop: Building Design Systems at Scale
- Panel: Open Source in Enterprise
{% /event %}`,
    },
    'map': {
      transform: map,
      description: 'Interactive map visualization from Markdown lists of locations with pins, routes, and grouped layers',
      seoType: 'Place',
      reinterprets: { list: 'location pins or route waypoints', heading: 'pin group label', strong: 'pin name', em: 'pin description', link: 'pin click URL' },
      category: 'Semantic',
      snippet: ['{% map zoom=${1:13} %}', '## ${2:Landmarks}', '', '- **${3:Place Name}** \\u2014 *${4:Description}* \\u2014 ${5:48.8566}, ${6:2.3522}', '{% /map %}'],
      fixture: `{% map zoom="13" height="large" %}
## Landmarks
- **Eiffel Tower** - *Iconic iron lattice tower* - 48.8566, 2.3522
- **Louvre Museum** - *World's largest art museum* - 48.8606, 2.3376

## Parks
- **Jardin du Luxembourg** - 48.8462, 2.3372
{% /map %}`,
    },
    'map-pin': {
      transform: mapPin,
      description: 'Individual map pin with location data',
    },
    'itinerary': {
      transform: itinerary,
      aliases: ['trip', 'travel-plan'],
      description: 'Travel itinerary with day groupings and timed stops. Headings become stops with "time — location" parsing; h2 headings create day groups.',
      seoType: 'ItemList',
      reinterprets: { heading: 'stop time and location (h2 = day group, h3 = stop)', paragraph: 'stop description' },
      category: 'Semantic',
      snippet: ['{% itinerary %}', '## Day 1 \\u2014 ${1:Arrival}', '', '### ${2:9:00 AM} \\u2014 ${3:Location}', '', '${4:Activity description.}', '{% /itinerary %}'],
      fixture: `{% itinerary variant="day-by-day" %}
## Day 1 — Arrival

### 9:00 AM — Narita Airport

Clear customs and pick up your Japan Rail Pass.

### 12:00 PM — Shinjuku

Check in to the hotel and grab lunch at a nearby ramen shop.

### 6:00 PM — Shibuya

Explore the famous crossing and have dinner in the area.

## Day 2 — Temples & Gardens

### 8:00 AM — Meiji Shrine

Start the day with a peaceful walk through the shrine grounds.
{% /itinerary %}`,
    },
    'itinerary-day': {
      transform: itineraryDay,
      description: 'Day grouping within an itinerary',
    },
    'itinerary-stop': {
      transform: itineraryStop,
      description: 'Individual stop within an itinerary with time, location, and optional duration/activity',
    },
  },
  theme: {
    runes: config as unknown as Record<string, Record<string, unknown>>,
  },
};

export default places;

export type {
	ItineraryStopProps, ItineraryDayProps, ItineraryProps,
	MapPinProps, MapProps, EventProps,
} from './props.js';
