import Markdoc from '@markdoc/markdoc';
const template = `{% template %}
{% section align=$attrs.align %}
	{% slot name="eyebrow" /%}

	{% slot name="headline" /%}
{% /section %}
{% /template %}`;
for (const slots of [false, true]) {
	const ast = Markdoc.parse(template, { slots } as any);
	const section = ast.children[0].children[0];
	console.log(
		`slots: ${slots} → section children: ${section.children.map((c: any) => c.tag ?? c.type).join(', ')}; section.slots: ${JSON.stringify(Object.keys(section.slots ?? {}))}`,
	);
}
const mixed = Markdoc.parse(
	`{% section %}\n{% slot "eyebrow" %}\nNew\n{% /slot %}\n{% /section %}`,
	{ slots: true } as any,
);
console.log(
	`primary form with slots: true → slots ${JSON.stringify(Object.keys(mixed.children[0].slots))}, children ${mixed.children[0].children.length}`,
);
