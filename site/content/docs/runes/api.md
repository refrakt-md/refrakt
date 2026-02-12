---
title: API
description: API endpoint documentation with method, path, and parameters
---

# API

API endpoint documentation. Headings become the endpoint title, tables become parameter lists, code blocks become request/response examples, and blockquotes become notes.

```markdoc
{% api method="GET" path="/api/users" auth="Bearer token" %}
## List Users

Returns a list of all users.

| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
{% /api %}
```

### Example

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

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `method` | `string` | `GET` | HTTP method: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS` |
| `path` | `string` | — | Endpoint path (required) |
| `auth` | `string` | — | Authentication requirement |
