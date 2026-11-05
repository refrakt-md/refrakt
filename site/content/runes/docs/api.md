---
title: API
description: API endpoint documentation with method, path, and parameters
category: Docs
plugin: docs
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:api"} /%}

API endpoint documentation. Headings become the endpoint title, tables become parameter lists, code blocks become request/response examples, and blockquotes become notes.

## GET endpoint

A basic GET endpoint with query parameters and a JSON response example.

{% preview source=true %}

	{% api method="GET" path="/api/users" auth="Bearer token" %}
	## List Users

	Returns a paginated list of users. Requires authentication.

	| Parameter | Type | Required | Description |
	|-----------|------|----------|-------------|
	| page | number | no | Page number (default: 1) |
	| limit | number | no | Items per page (default: 20) |
	| sort | string | no | Sort field |

	```json
	{
	  "users": [
	    { "id": 1, "name": "Alice", "email": "alice@example.com" }
	  ],
	  "total": 42,
	  "page": 1
	}
	```

	> Rate limited to 100 requests per minute per API key.
	{% /api %}

{% /preview %}

## POST endpoint

A POST endpoint with a request body and response example.

{% preview source=true %}

	{% api method="POST" path="/api/users" auth="Bearer token" %}
	## Create User

	Creates a new user account.

	| Parameter | Type | Required | Description |
	|-----------|------|----------|-------------|
	| name | string | yes | User's full name |
	| email | string | yes | Email address |
	| role | string | no | User role (default: "member") |

	```json
	{
	  "id": 2,
	  "name": "Bob",
	  "email": "bob@example.com",
	  "role": "member"
	}
	```
	{% /api %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:api"} /%}
