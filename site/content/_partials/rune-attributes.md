{% data src="site/content/_data/rune-attributes.json" root="own" where=$r headers="Attribute, Type, Required, Description" %}
{% code %}{% $row.name %}{% /code %}
---
{% code %}{% $row.type %}{% /code %}
---
{% if $row.required %}✓{% else /%}—{% /if %}
---
{% $row.description %}
{% /data %}

{% data src="site/content/_data/rune-attributes.json" root="base" where=$r limit=1 %}
### Inherited from the {% code %}{% $row.preset %}{% /code %} preset
{% /data %}

{% data src="site/content/_data/rune-attributes.json" root="base" where=$r headers="Attribute, Type, Required, Description" %}
{% code %}{% $row.name %}{% /code %}
---
{% code %}{% $row.type %}{% /code %}
---
{% if $row.required %}✓{% else /%}—{% /if %}
---
{% $row.description %}
{% /data %}

{% data src="site/content/_data/rune-attributes.json" root="axesAvailable" where=$r limit=1 %}
### Universal attributes
{% /data %}

{% accordion schema="none" %}
{% data src="site/content/_data/rune-attributes.json" root="axesAvailable" where=$r %}
## {% $row.axis %}

{% $row.description %}

{% data src="site/content/_data/rune-attributes.json" root="axisAttributes" where=$row.query headers="Attribute, Type, Required, Description" %}
{% code %}{% $row.name %}{% /code %}
---
{% code %}{% $row.type %}{% /code %}
---
{% if $row.required %}✓{% else /%}—{% /if %}
---
{% $row.description %}
{% /data %}
{% /data %}
{% /accordion %}

{% data src="site/content/_data/rune-attributes.json" root="axesUnavailable" where=$r headers="Not available, Why" %}
{% $row.axes %}
---
{% $row.reason %}
{% /data %}
