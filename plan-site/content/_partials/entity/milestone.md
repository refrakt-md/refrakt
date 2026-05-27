{% expand $item.id level=1 /%}


## Work

{% progress value=$item.data.progressDone max=$item.data.progressTotal%}Acceptance criteria{%/progress%}

{% collection type="work,bug" filter=concat("milestone:", $item.id) group="status" group-display="accordion" sort="priority" %}
{% partial file="entity-card.md" variables={item: $item} /%}
{% /collection %}

## Relationships

{% relationships of=$item.id %}
{% partial file="entity-card.md" variables={item: $item} /%}
{% /relationships %}

## History

{% plan-history id=$item.id /%}
