import { describe, it, expect } from 'vitest';
import { parse, findTag, fields } from './helpers.js';

describe('api tag', () => {
	it('should transform a basic API endpoint', () => {
		const result = parse(`{% api method="GET" path="/api/users" %}
## List Users

Returns a list of all users.

| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
{% /api %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'api');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('article');
	});

	it('should pass method, path, and auth as meta', () => {
		const result = parse(`{% api method="POST" path="/api/users" auth="Bearer token" %}
## Create User

Creates a new user.
{% /api %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'api');

		expect(fields(tag).method).toBe('POST');
		expect(fields(tag).path).toBe('/api/users');
		expect(fields(tag).auth).toBe('Bearer token');
	});

	it('should work with endpoint alias', () => {
		const result = parse(`{% endpoint method="DELETE" path="/api/users/:id" %}
## Delete User

Deletes a user by ID.
{% /endpoint %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'api');
		expect(tag).toBeDefined();
	});
});
