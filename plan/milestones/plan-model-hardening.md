{% milestone name="v0.28.0" status="planning" %}

# v0.28.0 — Plan model hardening

Tighten the plan runes' data model along three axes: status vocabulary, spec/PR traceability, and the dependency graph — then sweep the existing content to match.

- Give `work` items honest terminal states (`cancelled`, `superseded`) and make the status vocabulary a true single source of truth ({% ref "SPEC-117" /%})
- Close the spec lifecycle loop — `implemented` / `shipped` statuses, ADR `rejected`, first-class `pr` references, and traceability rollups ({% ref "SPEC-049" /%})
- Make dependency cycle-detection meaningful via a directed model, clearing the 88 false-positive `circular-dependency` errors ({% ref "SPEC-114" /%})
- Sweep the plan corpus: retire the pending unbuilt-rune backlog and correct stranded statuses, using the new vocabulary

{% /milestone %}
