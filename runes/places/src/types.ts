import { useSchema } from '@refrakt-md/types';
import { Event, EventComponent } from './schema/event.js';
import { Itinerary, ItineraryComponent, ItineraryDay, ItineraryDayComponent, ItineraryStop, ItineraryStopComponent } from './schema/itinerary.js';
import { Map, MapComponent, MapPin, MapPinComponent } from './schema/map.js';

export const schema = {
  Event: useSchema(Event).defineType<EventComponent>('Event'),
  Itinerary: useSchema(Itinerary).defineType<ItineraryComponent>('Itinerary'),
  ItineraryDay: useSchema(ItineraryDay).defineType<ItineraryDayComponent>('ItineraryDay'),
  ItineraryStop: useSchema(ItineraryStop).defineType<ItineraryStopComponent>('ItineraryStop'),
  Map: useSchema(Map).defineType<MapComponent>('Map'),
  MapPin: useSchema(MapPin).defineType<MapPinComponent>('MapPin'),
};
