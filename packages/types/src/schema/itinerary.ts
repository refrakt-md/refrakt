import { ComponentType } from "../interfaces.js";
import { PageSection, PageSectionProperties } from "./page.js";

export class ItineraryStop {
	time: string = '';
	location: string = '';
	duration: string = '';
	activity: string = '';
	lat: string = '';
	lng: string = '';
}

export interface ItineraryStopComponent extends ComponentType<ItineraryStop> {
	tag: 'li',
	properties: {
		time: 'time',
		location: 'span',
		duration: 'meta',
		activity: 'meta',
		lat: 'meta',
		lng: 'meta',
	},
	refs: {
		body: 'div',
	}
}

export class ItineraryDay {
	label: string = '';
	date: string = '';
	stop: ItineraryStop[] = [];
}

export interface ItineraryDayComponent extends ComponentType<ItineraryDay> {
	tag: 'article',
	properties: {
		label: 'h3',
		date: 'meta',
		stop: 'li',
	},
	refs: {
		stops: 'ol',
	}
}

export class Itinerary extends PageSection {
	day: ItineraryDay[] = [];
	style: string = 'day-by-day';
	direction: string = 'vertical';
}

export interface ItineraryProperties extends PageSectionProperties {
	day: 'article',
}

export interface ItineraryComponent extends ComponentType<Itinerary> {
	tag: 'section',
	properties: ItineraryProperties & {
		style: 'meta',
		direction: 'meta',
	},
	refs: {
		days: 'div',
	}
}
