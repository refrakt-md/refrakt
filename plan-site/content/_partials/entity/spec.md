{% expand $item.id level=1 /%}

## Relationships

{% relationships of=$item.id %}
{% partial file="entity-card.md" variables={item: $item} /%}
{% /relationships %}

## History

{% plan-history id=$item.id /%}
