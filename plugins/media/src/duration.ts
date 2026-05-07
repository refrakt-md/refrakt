import * as Duration from 'iso8601-duration';

/**
 * Parse a duration string into seconds.
 * Supports: mm:ss, h:mm:ss, ISO 8601 (PT5M55S)
 */
export function parseDuration(value: string): number {
	if (!value) return 0;

	// ISO 8601 format (PT5M55S)
	if (value.startsWith('PT') || value.startsWith('P')) {
		try {
			const d = Duration.parse(value);
			return (d.hours ?? 0) * 3600 + (d.minutes ?? 0) * 60 + (d.seconds ?? 0);
		} catch {
			return 0;
		}
	}

	// h:mm:ss or mm:ss
	const parts = value.split(':').map(Number);
	if (parts.some(isNaN)) return 0;

	if (parts.length === 3) {
		return parts[0] * 3600 + parts[1] * 60 + parts[2];
	}
	if (parts.length === 2) {
		return parts[0] * 60 + parts[1];
	}

	return 0;
}

/**
 * Format seconds into a human-readable duration string.
 * Returns mm:ss or h:mm:ss.
 */
export function formatDuration(seconds: number): string {
	if (seconds <= 0) return '0:00';

	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);

	if (h > 0) {
		return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
	}
	return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Convert seconds to ISO 8601 duration.
 */
export function toIso8601(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);

	let result = 'PT';
	if (h > 0) result += `${h}H`;
	if (m > 0) result += `${m}M`;
	if (s > 0 || result === 'PT') result += `${s}S`;
	return result;
}
