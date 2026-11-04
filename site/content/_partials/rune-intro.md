{% data src="site/content/_data/rune-intro.json" root=$site.name where=$r limit=1 %}
	{% section prominence="prominent" %}
		{% $row.packageLabel %}

		# {% $row.title %}

		{% $row.description %}

		{% bar %}
			{% if $row.compositionBadge %}{% badge %}{% icon name="puzzle" size="1em" /%} Composition{% /badge %}{% /if %} {% if $row.staged %}{% badge sentiment="caution" %}{% icon name="puzzle" size="1em" /%} Staged{% /badge %}{% /if %} {% if $row.unstable %}{% badge sentiment="caution" %}{% $row.status %}{% /badge %}{% /if %} {% if $row.publishes %}{% link href=$row.schemaUrl %}{% badge %}{% $row.schemaType %}{% /badge %}{% /link %}{% /if %}

			---

			{% if $row.plugin %}
				{% actions %}
				- [{% icon name="package" /%} Install](#rune-install)
				- [{% icon name="code" /%} Source](#rune-source)
				{% /actions %}
			{% /if %}

			{% if $row.core %}
				{% actions %}
				- [{% icon name="code" /%} Source](#rune-source)
				{% /actions %}
			{% /if %}
		{% /bar %}
	{% /section %}

	{% if $row.plugin %}
		{% drawer id="rune-install" title="Install" %}
		1. Add the package: {% code %}npm install {% $row.package %}{% /code %}
		2. Add it to the `plugins` array in `refrakt.config.json`: {% code %}"plugins": ["{% $row.package %}"]{% /code %}

		{% link href=$row.packageUrl %}About the plugin and its runes{% /link %}
		{% /drawer %}
	{% /if %}

	{% drawer id="rune-source" title="Source" %}
		{% snippet path=$row.source /%}

		{% link href=$row.sourceUrl %}View {% $row.source %} on GitHub{% /link %}
	{% /drawer %}
{% /data %}
