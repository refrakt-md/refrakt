import { PageSection } from "@refrakt-md/types";

export class ItineraryStop {
	time: string = '';
	location: string = '';
	duration: string = '';
	activity: string = '';
	lat: string = '';
	lng: string = '';
}

export class ItineraryDay {
	label: string = '';
	date: string = '';
	stop: ItineraryStop[] = [];
}

export class Itinerary extends PageSection {
	day: ItineraryDay[] = [];
	variant: string = 'day-by-day';
	direction: string = 'vertical';
}
