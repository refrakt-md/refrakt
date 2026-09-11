<!--
  The attribute reference every /runes/ page renders (SPEC-128 / WORK-548).

  Included rather than partialled: it uses the data rune, which resolves in the
  preprocess phase - before Markdoc expands a partial. See /runes/include.

      include file="rune-attributes.md" variables={r: "rune:card"}

  $r is the page's one binding, pre-formatted as a filter because `where` takes
  a single string and nothing concatenates at preprocess time.

  Five sections, each rendering nothing when its query is empty (BUG-011) - so a
  rune with no base preset shows no preset heading, and one with no universal
  axes shows no accordion at all.

  Regenerate the data with `npm run runes:attributes`.
-->

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

{% accordion %}
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
