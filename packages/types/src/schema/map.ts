import { ComponentType } from "../interfaces.js";

export class MapPin {
	name: string = '';
	description: string = '';
	lat: string = '';
	lng: string = '';
	address: string = '';
	url: string = '';
	group: string = '';
}

export interface MapPinComponent extends ComponentType<MapPin> {
	tag: 'li',
	properties: {
		name: 'span',
		description: 'span',
		lat: 'meta',
		lng: 'meta',
		address: 'meta',
		url: 'meta',
		group: 'meta',
	},
	refs: {}
}

export class Map {
	pin: MapPin[] = [];
	zoom: string = '';
	center: string = '';
	style: string = 'street';
	height: string = 'medium';
	provider: string = 'openstreetmap';
	interactive: string = 'true';
	route: string = 'false';
	cluster: string = 'false';
}

export interface MapComponent extends ComponentType<Map> {
	tag: 'div',
	properties: {
		pin: 'li',
		zoom: 'meta',
		center: 'meta',
		style: 'meta',
		height: 'meta',
		provider: 'meta',
		interactive: 'meta',
		route: 'meta',
		cluster: 'meta',
	},
	refs: {
		pins: 'ol',
	}
}
