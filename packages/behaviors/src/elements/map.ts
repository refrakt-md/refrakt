interface PinData {
	name: string;
	description: string;
	lat: number;
	lng: number;
	address: string;
	url: string;
	group: string;
}

const tileUrls: Record<string, Record<string, string>> = {
	openstreetmap: {
		street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
		terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
		dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
		minimal: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
	},
	mapbox: {
		street: 'streets-v12',
		satellite: 'satellite-streets-v12',
		terrain: 'outdoors-v12',
		dark: 'dark-v11',
		minimal: 'light-v11',
	},
};

const attributions: Record<string, string> = {
	openstreetmap: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	mapbox: '&copy; <a href="https://www.mapbox.com/">Mapbox</a>',
};

const geocodeCache = new Map<string, [number, number]>();

async function geocode(address: string): Promise<[number, number] | null> {
	if (geocodeCache.has(address)) return geocodeCache.get(address)!;
	try {
		const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
		const res = await fetch(url, { headers: { 'User-Agent': 'refrakt-md-map-rune/1.0' } });
		const data = await res.json();
		if (data.length > 0) {
			const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
			geocodeCache.set(address, coords);
			return coords;
		}
	} catch { /* geocoding failed */ }
	return null;
}

/**
 * <rf-map> — interactive Leaflet.js map with markers, popups, routes, and clustering.
 *
 * Reads configuration from data attributes (data-zoom, data-center, data-style,
 * data-height, data-provider, data-interactive, data-route, data-cluster, data-api-key).
 * Extracts pin data from child <ol> → <li> elements with data-typeof="MapPin".
 *
 * Progressive enhancement: shows a structured list of locations until Leaflet loads.
 */
import { SafeHTMLElement } from './ssr-safe.js';

export class RfMap extends SafeHTMLElement {
	private mapInstance: any = null;
	private initializing = false;

	connectedCallback() {
		const pins = this.extractPins();
		if (pins.length > 0) {
			this.initLeaflet(pins);
		}
	}

	disconnectedCallback() {
		if (this.mapInstance) {
			this.mapInstance.remove();
			this.mapInstance = null;
		}
	}

	private extractPins(): PinData[] {
		const result: PinData[] = [];
		const pinsContainer = this.querySelector('ol');
		if (!pinsContainer) return result;

		for (const li of pinsContainer.querySelectorAll<HTMLElement>('li[data-typeof="MapPin"], li[typeof="MapPin"]')) {
			const readMeta = (prop: string) =>
				li.querySelector<HTMLMetaElement>(`meta[property="${prop}"]`)?.content || '';
			const readSpan = (prop: string) =>
				li.querySelector<HTMLElement>(`span[property="${prop}"]`)?.textContent || '';

			result.push({
				name: readSpan('name'),
				description: readSpan('description'),
				lat: parseFloat(readMeta('lat')) || 0,
				lng: parseFloat(readMeta('lng')) || 0,
				address: readMeta('address'),
				url: readMeta('url'),
				group: readMeta('group'),
			});
		}
		return result;
	}

	private async initLeaflet(pins: PinData[]) {
		if (this.initializing || this.mapInstance) return;
		this.initializing = true;

		try {
			// Load Leaflet CSS
			if (!document.querySelector('link[href*="leaflet@1.9.4"]')) {
				const linkEl = document.createElement('link');
				linkEl.rel = 'stylesheet';
				linkEl.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
				document.head.appendChild(linkEl);
			}

			// Load Leaflet JS
			const cdn = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js';
			const L = await import(/* @vite-ignore */ cdn);

			// Read config from data attributes
			const centerAttr = this.dataset.center || '';
			const zoomAttr = this.dataset.zoom || '';
			const mapStyle = this.dataset.style || 'street';
			const provider = this.dataset.provider || 'openstreetmap';
			const interactive = this.dataset.interactive !== 'false';
			const route = this.dataset.route === 'true';
			const cluster = this.dataset.cluster === 'true';
			const apiKey = this.dataset.apiKey || '';

			// Resolve pin coordinates
			const resolvedPins = await Promise.all(
				pins.map(async (pin) => {
					if (pin.lat && pin.lng) return { ...pin };
					if (pin.address) {
						const coords = await geocode(pin.address);
						if (coords) return { ...pin, lat: coords[0], lng: coords[1] };
					}
					if (pin.name) {
						const coords = await geocode(pin.name);
						if (coords) return { ...pin, lat: coords[0], lng: coords[1] };
					}
					return null;
				})
			);
			const validPins = resolvedPins.filter((p): p is PinData => p !== null && p.lat !== 0 && p.lng !== 0);
			if (validPins.length === 0) return;

			// Create map container
			let container = this.querySelector<HTMLElement>('.rf-map__container');
			if (!container) {
				container = document.createElement('div');
				container.className = 'rf-map__container';
				this.prepend(container);
			}
			// Clear fallback content inside the container
			const fallback = container.querySelector('.rf-map__fallback');
			if (fallback) fallback.remove();

			// Determine center
			let mapCenter: [number, number];
			if (centerAttr) {
				const coordMatch = centerAttr.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
				if (coordMatch) {
					mapCenter = [parseFloat(coordMatch[1]), parseFloat(coordMatch[2])];
				} else {
					const geocoded = await geocode(centerAttr);
					mapCenter = geocoded || [validPins[0].lat, validPins[0].lng];
				}
			} else {
				const lats = validPins.map(p => p.lat);
				const lngs = validPins.map(p => p.lng);
				mapCenter = [
					(Math.min(...lats) + Math.max(...lats)) / 2,
					(Math.min(...lngs) + Math.max(...lngs)) / 2,
				];
			}

			const mapZoom = zoomAttr ? parseInt(zoomAttr) : 13;

			// Create map
			const map = L.map(container, {
				zoomControl: interactive,
				dragging: interactive,
				scrollWheelZoom: interactive,
				doubleClickZoom: interactive,
				touchZoom: interactive,
			}).setView(mapCenter, mapZoom);

			// Add tile layer
			if (provider === 'mapbox') {
				const style = tileUrls.mapbox[mapStyle] || tileUrls.mapbox.street;
				L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/256/{z}/{x}/{y}@2x?access_token=${apiKey}`, {
					attribution: attributions.mapbox,
					tileSize: 512,
					zoomOffset: -1,
				}).addTo(map);
			} else {
				const tileUrl = tileUrls.openstreetmap[mapStyle] || tileUrls.openstreetmap.street;
				L.tileLayer(tileUrl, { attribution: attributions.openstreetmap }).addTo(map);
			}

			// Group pins
			const groups = new Map<string, PinData[]>();
			for (const pin of validPins) {
				const group = pin.group || '';
				if (!groups.has(group)) groups.set(group, []);
				groups.get(group)!.push(pin);
			}

			const allMarkers: any[] = [];
			const layerGroups: Record<string, any> = {};

			for (const [groupName, groupPins] of groups) {
				const markers = groupPins.map(pin => {
					const marker = L.marker([pin.lat, pin.lng]);
					let popup = '';
					if (pin.name) popup += `<strong>${pin.name}</strong>`;
					if (pin.description) popup += `<br><em>${pin.description}</em>`;
					if (pin.address) popup += `<br><small>${pin.address}</small>`;
					if (pin.url) popup += `<br><a href="${pin.url}" target="_blank" rel="noopener">More info</a>`;
					if (popup) marker.bindPopup(popup);
					return marker;
				});

				if (groupName) {
					const layerGroup = L.layerGroup(markers).addTo(map);
					layerGroups[groupName] = layerGroup;
				} else {
					markers.forEach((m: any) => m.addTo(map));
				}
				allMarkers.push(...markers);
			}

			// Layer control
			if (Object.keys(layerGroups).length > 0) {
				L.control.layers(null, layerGroups).addTo(map);
			}

			// Route line
			if (route && validPins.length > 1) {
				const routeCoords = validPins.map(p => [p.lat, p.lng] as [number, number]);
				L.polyline(routeCoords, {
					color: 'var(--rf-color-primary, #3b82f6)',
					weight: 3,
					opacity: 0.7,
					dashArray: '8, 8',
				}).addTo(map);
			}

			// Clustering
			if (cluster && allMarkers.length > 0) {
				try {
					const clusterCdn = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster-src.js';
					const clusterCss = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
					const clusterDefaultCss = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';

					for (const href of [clusterCss, clusterDefaultCss]) {
						if (!document.querySelector(`link[href="${href}"]`)) {
							const link = document.createElement('link');
							link.rel = 'stylesheet';
							link.href = href;
							document.head.appendChild(link);
						}
					}

					await new Promise<void>((resolve, reject) => {
						const script = document.createElement('script');
						script.src = clusterCdn;
						script.onload = () => resolve();
						script.onerror = reject;
						document.head.appendChild(script);
					});

					// @ts-ignore - MarkerClusterGroup is added to L by the plugin
					const clusterGroup = L.markerClusterGroup();
					allMarkers.forEach((m: any) => {
						m.remove();
						clusterGroup.addLayer(m);
					});
					map.addLayer(clusterGroup);
				} catch {
					// Clustering failed, markers remain as individual
				}
			}

			// Fit bounds if no explicit center/zoom
			if (!centerAttr && !zoomAttr && validPins.length > 1) {
				const bounds = L.latLngBounds(validPins.map(p => [p.lat, p.lng]));
				map.fitBounds(bounds, { padding: [30, 30] });
			}

			this.mapInstance = map;
		} catch (e) {
			console.warn('Map rune: Leaflet failed to load', e);
		} finally {
			this.initializing = false;
		}
	}
}
