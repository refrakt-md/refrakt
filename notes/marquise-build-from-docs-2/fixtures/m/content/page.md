# A page

{% snippets title="Install" %}
Pick your *package manager*.

```sh label="npm"
npm i x
```

```sh
yarn add x
```

> works offline
{% /snippets %}

{% snippets title=5 size="lg" %}
Just an intro, no fences.
{% /snippets %}

{% credits %}
# Team

- Ada — engineer
- Grace - designer
- Linus – plumber
{% /credits %}

{% person #ada name="Ada Lovelace" role="wizard" tags="math, poetry" contact={email: "ada@example.org"} /%}

{% person role="engineer" %}
Stray prose.
{% /person %}

{% broken %}
x
{% /broken %}

{% callout %}
Unknown.
{% /callout %}
