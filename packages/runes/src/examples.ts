/** Hand-crafted usage examples for each author-facing rune */
export const RUNE_EXAMPLES: Record<string, string> = {
	hint: `{% hint type="note" %}
This is a helpful note for your readers.
{% /hint %}`,

	grid: `{% grid %}
Column one content.

---

Column two content.

---

Column three content.
{% /grid %}`,

	tabs: `{% tabs %}
## npm

\`\`\`shell
npm install @refrakt-md/runes
\`\`\`

## yarn

\`\`\`shell
yarn add @refrakt-md/runes
\`\`\`
{% /tabs %}`,

	codegroup: `{% codegroup %}
\`\`\`js
console.log('Hello');
\`\`\`

\`\`\`python
print('Hello')
\`\`\`
{% /codegroup %}`,

	nav: `{% nav %}
## Getting Started
- getting-started
- installation

## Guides
- theming
- deployment
{% /nav %}`,

	layout: `{% layout %}
{% region name="header" %}
# Site Title
{% /region %}

{% region name="nav" %}
{% nav %}
- getting-started
- runes
{% /nav %}
{% /region %}
{% /layout %}`,

	region: `{% region name="nav" %}
{% nav %}
- page-one
- page-two
{% /nav %}
{% /region %}`,

	details: `{% details summary="How does billing work?" %}
We bill monthly on the date you signed up. You can cancel anytime
from your account settings.
{% /details %}`,

	figure: `{% figure size="large" align="center" caption="Dashboard overview" %}
![Dashboard](/images/dashboard.png)
{% /figure %}`,

	accordion: `{% accordion headingLevel=2 %}
## What is refrakt.md?

A content framework that extends Markdown with semantic runes.

## How do I install it?

Run \`npm install @refrakt-md/runes\` to get started.

## Is it free?

Yes, refrakt.md is open source and free to use.
{% /accordion %}`,

	toc: `{% toc depth=3 %}{% /toc %}`,

	breadcrumb: `{% breadcrumb %}
- [Home](/)
- [Docs](/docs)
- [Runes](/docs/runes)
- Hero
{% /breadcrumb %}`,

	compare: `{% compare %}
\`\`\`javascript
// Before
const x = 1;
const y = 2;
\`\`\`

\`\`\`javascript
// After
const [x, y] = [1, 2];
\`\`\`
{% /compare %}`,

	embed: `{% embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" %}
Watch the video for a full walkthrough.
{% /embed %}`,

	datatable: `{% datatable sortable="Name,Price" searchable=true pageSize=10 %}
| Name | Price | Category | Stock |
|------|-------|----------|-------|
| Widget A | $9.99 | Tools | 150 |
| Widget B | $14.99 | Tools | 85 |
| Gadget X | $24.99 | Electronics | 42 |
{% /datatable %}`,

	diff: `{% diff mode="unified" language="javascript" %}
\`\`\`javascript
function getData() {
  return fetch('/api')
    .then(res => res.json())
    .then(data => data);
}
\`\`\`

\`\`\`javascript
async function getData() {
  const res = await fetch('/api');
  return res.json();
}
\`\`\`
{% /diff %}`,

	chart: `{% chart type="bar" title="Monthly Revenue" %}
| Month | Revenue | Expenses |
|-------|---------|----------|
| Jan   | 4200    | 3100     |
| Feb   | 5100    | 3400     |
| Mar   | 4800    | 3200     |
| Apr   | 6200    | 3800     |
{% /chart %}`,

	diagram: `{% diagram language="mermaid" title="User Flow" %}
\`\`\`mermaid
graph TD
  A[Visit Site] --> B{Logged In?}
  B -->|Yes| C[Dashboard]
  B -->|No| D[Login Page]
  D --> E[Sign Up]
  D --> F[Sign In]
  F --> C
  E --> C
\`\`\`
{% /diagram %}`,

	sidenote: `{% sidenote %}
This is a margin note that provides additional context
without interrupting the main flow of the text.
{% /sidenote %}`,

	sandbox: `{% sandbox framework="tailwind" %}
<div class="flex items-center gap-4 p-6 bg-white rounded-xl shadow-lg max-w-sm">
  <img src="https://i.pravatar.cc/80" alt="Avatar" class="w-16 h-16 rounded-full" />
  <div>
    <h3 class="text-lg font-semibold text-gray-900">Jane Doe</h3>
    <p class="text-sm text-gray-500">Product Designer</p>
  </div>
</div>
{% /sandbox %}`,

	form: `{% form action="/api/contact" method="POST" success="Thanks! We'll be in touch." %}
# Contact Us

- Name (required)
- Email (required, placeholder: "you@example.com")
- Company (optional)

> What are you interested in?
- Product demo
- Partnership
- Support
- Other

- Message (required)

**Send Message**
{% /form %}`,

	budget: `{% budget title="Tokyo Trip" currency="JPY" travelers=2 duration="5 days" %}
## Accommodation

- Hotel in Shinjuku: ¥15000
- Ryokan in Hakone: ¥25000

## Transportation

- Japan Rail Pass (7-day): ¥29650
- Airport transfer: ¥3000

## Food & Dining

- Daily meals: ¥5000
- Sushi experience: ¥8000
{% /budget %}`,

	pullquote: `{% pullquote align="center" style="accent" %}
> Design is not just what it looks like and feels like. Design is how it works.
{% /pullquote %}`,

	textblock: `{% textblock dropcap=true columns=2 %}
The invention of the printing press in the 15th century revolutionized the spread of information across Europe. Before Gutenberg, books were painstakingly copied by hand, making them rare and expensive.

With movable type, ideas could be reproduced quickly and cheaply. This democratization of knowledge helped fuel the Renaissance, the Reformation, and the Scientific Revolution.
{% /textblock %}`,

	mediatext: `{% mediatext align="left" ratio="1:1" %}
![Mountain landscape](https://picsum.photos/seed/mountain/600/400)

The valley stretches out below, carved by millennia of glacial movement. In spring, wildflowers carpet the meadows in brilliant color, attracting hikers and photographers from around the world.
{% /mediatext %}`,
};
