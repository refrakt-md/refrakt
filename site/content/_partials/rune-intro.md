{% data src="site/content/_data/rune-intro.json" root="runes" where=$r limit=1 %}
	{% section prominence="prominent" %}
		{% link href=$row.packageUrl %}{% $row.packageLabel %}{% /link %}

		# {% $row.title %}

		{% $row.description %}

		{% bar %}
		{% if $row.composed %}{% badge %}{% icon name="puzzle" size="1em" /%} Composition{% /badge %}{% /if %} {% if $row.unstable %}{% badge sentiment="caution" %}{% $row.status %}{% /badge %}{% /if %} {% if $row.publishes %}{% link href=$row.schemaUrl %}{% badge %}{% $row.schemaType %}{% /badge %}{% /link %}{% /if %}

		---

		{% if $row.plugin %}{% ref "rune-install" label="Install" /%}{% /if %} {% file-ref path=$row.source preview="drawer" label="Source" /%}
		{% /bar %}
	{% /section %}

	{% if $row.plugin %}
		{% drawer id="rune-install" title="Install" %}
		1. Add the package: {% code %}npm install {% $row.package %}{% /code %}
		2. Add it to the `plugins` array in `refrakt.config.json`: {% code %}"plugins": ["{% $row.package %}"]{% /code %}

		{% link href=$row.packageUrl %}About the plugin and its runes{% /link %}
		{% /drawer %}
	{% /if %}
{% /data %}
