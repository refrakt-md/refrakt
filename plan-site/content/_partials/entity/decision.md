{% expand $item.id level=1 /%}

## Relationships

{% relationships of=$item.id /%}

## History

{% plan-history id=$item.id /%}
