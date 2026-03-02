import type { RunePackage } from '@refrakt-md/types';
import { event } from './tags/event.js';
import { map, mapPin } from './tags/map.js';
import { itinerary, itineraryDay, itineraryStop } from './tags/itinerary.js';
import { config } from './config.js';

export const places: RunePackage = {
  name: 'places',
  displayName: 'Places',
  version: '0.6.0',
  runes: {
    'event': {
      transform: event,
      description: 'Event information with date, location, and agenda',
      seoType: 'Event',
      reinterprets: { heading: 'event name', list: 'speakers/agenda', blockquote: 'venue description', link: 'registration URL' },
    },
    'map': {
      transform: map,
      description: 'Interactive map visualization from Markdown lists of locations with pins, routes, and grouped layers',
      seoType: 'Place',
      reinterprets: { list: 'location pins or route waypoints', heading: 'pin group label', strong: 'pin name', em: 'pin description', link: 'pin click URL' },
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
