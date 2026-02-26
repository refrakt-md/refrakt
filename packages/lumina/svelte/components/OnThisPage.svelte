<script lang="ts">
	interface Heading {
		level: number;
		text: string;
		id: string;
	}

	interface Props {
		headings: Heading[];
	}

	let { headings }: Props = $props();

	// Filter to h2 and h3 only
	const filtered = $derived(headings.filter(h => h.level >= 2 && h.level <= 3));
</script>

<nav class="rf-on-this-page" data-scrollspy>
	<p class="rf-on-this-page__title">On this page</p>
	<ul class="rf-on-this-page__list">
		{#each filtered as heading}
			<li class="rf-on-this-page__item" data-level={heading.level}>
				<a href="#{heading.id}">{heading.text}</a>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.rf-on-this-page {
		font-size: 0.8rem;
	}

	.rf-on-this-page__title {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--rf-color-muted, #64748b);
		margin: 0 0 0.75rem;
	}

	.rf-on-this-page__list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.rf-on-this-page__item {
		border-left: 2px solid transparent;
	}

	.rf-on-this-page__item[data-level="3"] {
		padding-left: 0.75rem;
	}

	.rf-on-this-page__item a {
		display: block;
		padding: 0.25rem 0.75rem;
		color: var(--rf-color-muted, #64748b);
		text-decoration: none;
		line-height: 1.4;
	}

	.rf-on-this-page__item a:hover {
		color: var(--rf-color-text, #1a1a2e);
	}

	.rf-on-this-page__item[data-active] {
		border-left-color: var(--rf-color-primary, #0ea5e9);
	}

	.rf-on-this-page__item[data-active] a {
		color: var(--rf-color-primary, #0ea5e9);
	}
</style>
