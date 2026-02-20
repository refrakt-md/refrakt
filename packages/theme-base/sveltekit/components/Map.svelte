<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const isMap = tag.attributes.typeof === 'Map';

	// Helper to read a meta child from the tag tree
	function findMeta(property: string): string {
		return tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === property)?.attributes?.content || '';
	}

	// Map-level properties — reactive so they update if tag prop changes (streaming)
	const zoom = $derived(isMap ? findMeta('zoom') : '');
	const center = $derived(isMap ? findMeta('center') : '');
	const mapStyle = $derived(isMap ? (tag.attributes['data-style'] || 'street') : 'street');
	const height = $derived(isMap ? (tag.attributes['data-height'] || 'medium') : 'medium');
	const provider = $derived(isMap ? (findMeta('provider') || 'openstreetmap') : 'openstreetmap');
	const interactive = $derived(isMap ? findMeta('interactive') !== 'false' : true);
	const route = $derived(isMap ? findMeta('route') === 'true' : false);
	const cluster = $derived(isMap ? findMeta('cluster') === 'true' : false);

	// Extract pin data from tag children
	interface PinData {
		name: string;
		description: string;
		lat: number;
		lng: number;
		address: string;
		url: string;
		group: string;
	}

	function isTag(node: any): node is SerializedTag {
		return typeof node === 'object' && node !== null && node.$$mdtype === 'Tag';
	}

	function readMeta(pinTag: SerializedTag, property: string): string {
		const meta = pinTag.children.find(
			(c: any) => isTag(c) && c.name === 'meta' && c.attributes?.property === property
		) as SerializedTag | undefined;
		return meta?.attributes?.content || '';
	}

	function readSpan(pinTag: SerializedTag, property: string): string {
		const span = pinTag.children.find(
			(c: any) => isTag(c) && c.name === 'span' && c.attributes?.property === property
		) as SerializedTag | undefined;
		return span?.children?.[0]?.toString() || '';
	}

	const pins: PinData[] = $derived.by(() => {
		if (!isMap) return [];
		const result: PinData[] = [];

		// Find the ol[data-name="pins"] container
		const pinsContainer = tag.children.find(
			(c: any) => isTag(c) && c.name === 'ol'
		) as SerializedTag | undefined;
		if (!pinsContainer) return result;

		for (const child of pinsContainer.children) {
			if (!isTag(child) || child.attributes?.typeof !== 'MapPin') continue;
			result.push({
				name: readSpan(child, 'name'),
				description: readSpan(child, 'description'),
				lat: parseFloat(readMeta(child, 'lat')) || 0,
				lng: parseFloat(readMeta(child, 'lng')) || 0,
				address: readMeta(child, 'address'),
				url: readMeta(child, 'url'),
				group: readMeta(child, 'group'),
			});
		}
		return result;
	});

	let container: HTMLDivElement;
	let rendered = $state(false);
	let mapInstance: any = null;
	let initializing = false;

	// Tile provider URLs
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

	// Geocode an address using Nominatim
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
		} catch {}
		return null;
	}

	async function initLeaflet() {
		if (initializing || rendered || !isMap || pins.length === 0 || !container) return;
		initializing = true;

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

			// Snapshot current reactive values for use in this async flow
			const currentPins = pins;
			const currentCenter = center;
			const currentZoom = zoom;
			const currentMapStyle = mapStyle;
			const currentProvider = provider;
			const currentInteractive = interactive;
			const currentRoute = route;
			const currentCluster = cluster;

			// Resolve pin coordinates (geocode addresses if needed, fall back to name)
			const resolvedPins = await Promise.all(
				currentPins.map(async (pin) => {
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

			// Determine center and zoom
			let mapCenter: [number, number];
			let mapZoom: number;

			if (currentCenter) {
				const coordMatch = currentCenter.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
				if (coordMatch) {
					mapCenter = [parseFloat(coordMatch[1]), parseFloat(coordMatch[2])];
				} else {
					const geocoded = await geocode(currentCenter);
					mapCenter = geocoded || [validPins[0].lat, validPins[0].lng];
				}
			} else {
				// Auto-center on pins
				const lats = validPins.map(p => p.lat);
				const lngs = validPins.map(p => p.lng);
				mapCenter = [
					(Math.min(...lats) + Math.max(...lats)) / 2,
					(Math.min(...lngs) + Math.max(...lngs)) / 2,
				];
			}

			mapZoom = currentZoom ? parseInt(currentZoom) : 13;

			// Create map
			const map = L.map(container, {
				zoomControl: currentInteractive,
				dragging: currentInteractive,
				scrollWheelZoom: currentInteractive,
				doubleClickZoom: currentInteractive,
				touchZoom: currentInteractive,
			}).setView(mapCenter, mapZoom);

			// Add tile layer
			if (currentProvider === 'mapbox') {
				const apiKey = tag.attributes['data-api-key'] || '';
				const style = tileUrls.mapbox[currentMapStyle] || tileUrls.mapbox.street;
				L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/256/{z}/{x}/{y}@2x?access_token=${apiKey}`, {
					attribution: attributions.mapbox,
					tileSize: 512,
					zoomOffset: -1,
				}).addTo(map);
			} else {
				const tileUrl = tileUrls.openstreetmap[currentMapStyle] || tileUrls.openstreetmap.street;
				L.tileLayer(tileUrl, { attribution: attributions.openstreetmap }).addTo(map);
			}

			// Group pins by group name
			const groups = new Map<string, typeof validPins>();
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

					// Build popup content
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
					markers.forEach(m => m.addTo(map));
				}

				allMarkers.push(...markers);
			}

			// Add layer control if there are named groups
			if (Object.keys(layerGroups).length > 0) {
				L.control.layers(null, layerGroups).addTo(map);
			}

			// Route line for ordered lists
			if (currentRoute && validPins.length > 1) {
				const routeCoords = validPins.map(p => [p.lat, p.lng] as [number, number]);
				L.polyline(routeCoords, {
					color: 'var(--rf-color-primary, #3b82f6)',
					weight: 3,
					opacity: 0.7,
					dashArray: '8, 8',
				}).addTo(map);
			}

			// Clustering
			if (currentCluster && allMarkers.length > 0) {
				try {
					const clusterCdn = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster-src.js';
					const clusterCss = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
					const clusterDefaultCss = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';

					// Load cluster CSS
					for (const href of [clusterCss, clusterDefaultCss]) {
						if (!document.querySelector(`link[href="${href}"]`)) {
							const link = document.createElement('link');
							link.rel = 'stylesheet';
							link.href = href;
							document.head.appendChild(link);
						}
					}

					// Load cluster JS via script tag (no ESM module available)
					await new Promise<void>((resolve, reject) => {
						const script = document.createElement('script');
						script.src = clusterCdn;
						script.onload = () => resolve();
						script.onerror = reject;
						document.head.appendChild(script);
					});

					// @ts-ignore - MarkerClusterGroup is added to L by the plugin
					const clusterGroup = L.markerClusterGroup();
					allMarkers.forEach(m => {
						m.remove();
						clusterGroup.addLayer(m);
					});
					map.addLayer(clusterGroup);
				} catch {
					// Clustering failed, markers remain as individual
				}
			}

			// Fit bounds if no explicit center/zoom
			if (!currentCenter && !currentZoom && validPins.length > 1) {
				const bounds = L.latLngBounds(validPins.map(p => [p.lat, p.lng]));
				map.fitBounds(bounds, { padding: [30, 30] });
			}

			mapInstance = map;
			rendered = true;
		} catch (e) {
			// Leaflet failed to load, fallback list remains visible
			console.warn('Map rune: Leaflet failed to load', e);
		} finally {
			initializing = false;
		}
	}

	// Reactive: trigger Leaflet init when pins become available (handles streaming)
	$effect(() => {
		if (pins.length > 0) {
			initLeaflet();
		}
	});

	// Cleanup on unmount
	onMount(() => {
		return () => {
			if (mapInstance) {
				mapInstance.remove();
				mapInstance = null;
			}
		};
	});

	const pinLabel = $derived(`Map with ${pins.length} location${pins.length !== 1 ? 's' : ''}: ${pins.map(p => p.name).filter(Boolean).join(', ')}`);
</script>

{#if isMap}
	<div class="rf-map rf-map--{height}" role="region" aria-label={pinLabel}>
		<div
			class="rf-map__container"
			bind:this={container}
			role="img"
			aria-label={pinLabel}
		>
			{#if !rendered}
				<ol class="rf-map__fallback">
					{#each pins as pin}
						<li>
							{#if pin.name}<strong>{pin.name}</strong>{/if}
							{#if pin.description} — {pin.description}{/if}
							{#if pin.address} ({pin.address}){/if}
						</li>
					{/each}
				</ol>
			{/if}
		</div>
		<ol class="rf-map__pins" aria-label="Locations list">
			{#each pins as pin}
				<li class="rf-map-pin">
					{#if pin.url}
						<a href={pin.url}>{pin.name}</a>
					{:else}
						<span>{pin.name}</span>
					{/if}
					{#if pin.description}<span class="rf-map-pin__description">{pin.description}</span>{/if}
					{#if pin.group}<span class="rf-map-pin__group">{pin.group}</span>{/if}
				</li>
			{/each}
		</ol>
	</div>
{:else}
	{@render children()}
{/if}
