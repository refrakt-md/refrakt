import Markdoc from '@markdoc/markdoc';
import { parseMarkdown } from 'comark';
const show = (label: string, v: unknown) => console.log(`--- ${label}\n${JSON.stringify(v)}`);

// 1. Comark: zone names as slot markers
show(
	'comark: #media / #content markers',
	(
		await parseMarkdown(`::hero
#media
![The dashboard](/img/d.png)

#content
New in 2.0

# Ship docs
::`)
	).nodes,
);

// 2. Comark: a delimited shape whose first zone is empty starts with ---
show(
	'comark: component content starting with ---',
	(
		await parseMarkdown(`::hero
---

New in 2.0

# Ship docs
::`)
	).nodes,
);

// 3. Markdoc native slots
const ast = Markdoc.parse(
	`{% hero %}
{% slot "headline" %}
Ship docs, *explicitly*
{% /slot %}

New in 2.0
{% /hero %}`,
	{ slots: true } as any,
);
const hero = ast.children[0];
show('markdoc: slots on the node', Object.keys(hero.slots ?? {}));
show(
	'markdoc: remaining children',
	hero.children.map((c) => c.type),
);

// 4. A `#name` line in Markdoc: what does it parse as?
const ast2 = Markdoc.parse(`{% hero %}
#headline
Ship docs

#default
New in 2.0
{% /hero %}`);
show(
	'markdoc: #name lines',
	ast2.children[0].children.map((c) => [
		c.type,
		c.children?.[0]?.children?.map((x: any) => x.attributes?.content),
	]),
);
