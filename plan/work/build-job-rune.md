{% work id="WORK-014" status="pending" priority="low" tags="runes, business" %}

# Build `job` Rune

> Ref: SPEC-008 (Unbuilt Runes) — Package: `@refrakt-md/business`

## Summary

Job listing with structured metadata. For careers pages and job boards. Alias: `posting`. Schema.org: `JobPosting`.

## Attributes

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `title` | String | — | Yes | Job title |
| `department` | String | — | No | Department or team |
| `location` | String | — | No | Location (e.g., "Remote", "San Francisco, CA") |
| `type` | String | `'full-time'` | No | `full-time`, `part-time`, `contract`, `internship` |
| `salary` | String | — | No | Salary range (e.g., "$120k–$160k") |
| `applyUrl` | String | — | No | Application URL |
| `posted` | String | — | No | Date posted (ISO 8601) |

## Content Model

- First paragraph → job summary/description
- `## Responsibilities` or `## What You'll Do` heading → responsibilities list
- `## Requirements` or `## Qualifications` heading → requirements list
- `## Nice to Have` or `## Preferred` heading → preferred qualifications list
- `## Benefits` heading → benefits list

## Transform Output

- typeof: `Job`
- Tag: `<article>`
- Properties: `title` (h-element), `department` (span), `location` (span), `type`, `salary` (span), `applyUrl`, `posted`
- Refs: `description` (div), `responsibilities` (ul), `requirements` (ul), `preferred` (ul), `benefits` (ul), `applyButton` (a)

## Implementation Tasks

1. Create schema in `runes/business/src/tags/job.ts`
2. Add RuneConfig entry in `runes/business/src/config.ts`
3. Write CSS in `packages/lumina/styles/runes/job.css`
4. Import CSS in `packages/lumina/index.css`
5. Add SEO extractor for `JobPosting` (title, datePosted, employmentType, jobLocation, baseSalary, description)
6. Write tests in `runes/business/test/tags/job.test.ts`
7. Create inspector fixture

## Dependencies

None — mostly declarative with sections content model.

{% /work %}
