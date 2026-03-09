export class MapPin {
	name: string = '';
	description: string = '';
	lat: string = '';
	lng: string = '';
	address: string = '';
	url: string = '';
	group: string = '';
}

export class Map {
	pin: MapPin[] = [];
	zoom: string = '';
	center: string = '';
	variant: string = 'street';
	height: string = 'medium';
	provider: string = 'openstreetmap';
	interactive: boolean = true;
	route: boolean = false;
	cluster: boolean = false;
}
