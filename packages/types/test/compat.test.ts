import { describe, it, expect } from 'vitest';
import { parseVersion, satisfiesRange, checkRefraktCompat } from '../src/compat.js';

describe('parseVersion', () => {
	it('parses major.minor.patch and major.minor', () => {
		expect(parseVersion('0.25.3')).toEqual({ major: 0, minor: 25, patch: 3 });
		expect(parseVersion('1.2')).toEqual({ major: 1, minor: 2, patch: 0 });
	});
	it('strips a leading v and pre-release/build metadata', () => {
		expect(parseVersion('v0.25.0-beta.1')).toEqual({ major: 0, minor: 25, patch: 0 });
		expect(parseVersion('0.25.0+build')).toEqual({ major: 0, minor: 25, patch: 0 });
	});
	it('rejects garbage', () => {
		expect(parseVersion('latest')).toBeNull();
		expect(parseVersion('')).toBeNull();
	});
});

describe('satisfiesRange', () => {
	it('honours a comparator set', () => {
		expect(satisfiesRange('0.25.0', '>=0.25 <0.26')).toBe(true);
		expect(satisfiesRange('0.25.9', '>=0.25 <0.26')).toBe(true);
		expect(satisfiesRange('0.26.0', '>=0.25 <0.26')).toBe(false);
		expect(satisfiesRange('0.24.9', '>=0.25 <0.26')).toBe(false);
	});
	it('treats an empty range as universal', () => {
		expect(satisfiesRange('9.9.9', '')).toBe(true);
	});
});

describe('checkRefraktCompat', () => {
	it('passes when in range', () => {
		expect(checkRefraktCompat('>=0.25 <0.26', '0.25.2')).toEqual({ ok: true });
	});
	it('treats a missing range as universal', () => {
		expect(checkRefraktCompat(undefined, '0.25.0')).toEqual({ ok: true });
		expect(checkRefraktCompat('', '0.25.0')).toEqual({ ok: true });
	});
	it('reports an out-of-range mismatch with a message', () => {
		const r = checkRefraktCompat('>=0.25 <0.26', '0.24.4');
		expect(r.ok).toBe(false);
		expect(r.malformed).toBeFalsy();
		expect(r.message).toContain('needs refrakt');
	});
	it('flags a malformed range distinctly', () => {
		const r = checkRefraktCompat('>=banana', '0.25.0');
		expect(r.ok).toBe(false);
		expect(r.malformed).toBe(true);
	});
});
