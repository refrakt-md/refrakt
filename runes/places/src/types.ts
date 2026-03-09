import {useSchema} from '@refrakt-md/types';
import {Event} from './schema/event.js';
import {Itinerary, ItineraryDay, ItineraryStop} from './schema/itinerary.js';
import {Map, MapPin} from './schema/map.js';

export const schema = {
  Event: useSchema(Event).defineType('Event', {}, 'Event'),
  Itinerary: useSchema(Itinerary).defineType('Itinerary', {}, 'ItemList'),
  ItineraryDay: useSchema(ItineraryDay).defineType('ItineraryDay'),
  ItineraryStop: useSchema(ItineraryStop).defineType('ItineraryStop'),
  Map: useSchema(Map).defineType('Map', {}, 'Place'),
  MapPin: useSchema(MapPin).defineType('MapPin'),
};
