{% if equals($item.type, "work") %}
{% partial file="work-card.md" variables={item: $item} /%}
{% /if %}

{% if equals($item.type, "bug") %}
{% partial file="bug-card.md" variables={item: $item} /%}
{% /if %}

{% if equals($item.type, "spec") %}
{% partial file="spec-card.md" variables={item: $item} /%}
{% /if %}

{% if equals($item.type, "decision") %}
{% partial file="decision-card.md" variables={item: $item} /%}
{% /if %}

{% if equals($item.type, "milestone") %}
{% partial file="milestone-card.md" variables={item: $item} /%}
{% /if %}
