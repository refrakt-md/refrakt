<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const isForm = tag.attributes.typeof === 'Form';

	// Form-level properties
	const action = isForm
		? tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'action')?.attributes?.content || ''
		: '';
	const method = isForm
		? tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'method')?.attributes?.content || 'POST'
		: 'POST';
	const success = isForm
		? tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'success')?.attributes?.content || ''
		: '';
	const errorMsg = isForm
		? tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'error')?.attributes?.content || ''
		: '';
	const formStyle = isForm
		? tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'style')?.attributes?.content || 'stacked'
		: 'stacked';
	const honeypot = isForm
		? tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'honeypot')?.attributes?.content !== 'false'
		: true;

	// FormField properties
	const fieldName = !isForm
		? tag.children.find((c: any) => c?.name === 'span' && c?.attributes?.property === 'name')?.children?.[0] || ''
		: '';
	const fieldType = !isForm
		? tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'fieldType')?.attributes?.content || 'text'
		: '';
	const required = !isForm
		? tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'required')?.attributes?.content === 'true'
		: false;
	const placeholder = !isForm
		? tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'placeholder')?.attributes?.content || ''
		: '';
	const options = !isForm
		? (tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'options')?.attributes?.content || '')
			.split(',')
			.map((o: string) => o.trim())
			.filter(Boolean)
		: [];

	const fieldId = !isForm ? `field-${fieldName.toLowerCase().replace(/\s+/g, '-')}` : '';

	// Form submission state
	let status = $state<'idle' | 'submitting' | 'success' | 'error'>('idle');
	let statusMessage = $state('');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!action) return;

		status = 'submitting';
		const formData = new FormData(e.target as HTMLFormElement);

		try {
			const response = await fetch(action, {
				method: method,
				body: formData,
				headers: { 'Accept': 'application/json' },
			});

			if (response.ok) {
				status = 'success';
				statusMessage = success || 'Form submitted successfully.';
				(e.target as HTMLFormElement).reset();
			} else {
				status = 'error';
				statusMessage = errorMsg || 'Something went wrong. Please try again.';
			}
		} catch {
			status = 'error';
			statusMessage = errorMsg || 'Something went wrong. Please try again.';
		}
	}
</script>

{#if isForm}
	<form
		class="form form-{formStyle}"
		action={action}
		method={method}
		onsubmit={handleSubmit}
	>
		{#if honeypot}
			<div class="form-hp" aria-hidden="true">
				<input type="text" name="_gotcha" autocomplete="off" tabindex={-1} />
			</div>
		{/if}
		{@render children()}
		{#if status === 'submitting'}
			<div class="form-status form-status-submitting" role="status">Submitting...</div>
		{:else if status === 'success'}
			<div class="form-status form-status-success" role="alert">{statusMessage}</div>
		{:else if status === 'error'}
			<div class="form-status form-status-error" role="alert">{statusMessage}</div>
		{/if}
	</form>
{:else if fieldType === 'group'}
	<fieldset class="form-fieldset">
		<legend>{fieldName}</legend>
		{@render children()}
	</fieldset>
{:else if fieldType === 'submit'}
	<button type="submit" class="form-submit">{fieldName}</button>
{:else if fieldType === 'separator'}
	<hr class="form-separator" />
{:else if fieldType === 'help'}
	<p class="form-help">{fieldName}</p>
{:else if fieldType === 'description'}
	<p class="form-text">{fieldName}</p>
{:else if fieldType === 'textarea'}
	<div class="form-field">
		<label for={fieldId}>
			{fieldName}
			{#if required}<span class="form-required" aria-hidden="true">*</span>{/if}
		</label>
		<textarea
			id={fieldId}
			name={fieldId}
			placeholder={placeholder}
			required={required}
			rows={4}
		></textarea>
	</div>
{:else if fieldType === 'select'}
	<div class="form-field">
		<label for={fieldId}>
			{fieldName}
			{#if required}<span class="form-required" aria-hidden="true">*</span>{/if}
		</label>
		<select id={fieldId} name={fieldId} required={required}>
			<option value="" disabled selected>Select an option</option>
			{#each options as option}
				<option value={option}>{option}</option>
			{/each}
		</select>
	</div>
{:else if fieldType === 'radio'}
	<fieldset class="form-field form-choice-group">
		<legend>
			{fieldName}
			{#if required}<span class="form-required" aria-hidden="true">*</span>{/if}
		</legend>
		{#each options as option, i}
			<label class="form-choice">
				<input
					type="radio"
					name={fieldId}
					value={option}
					required={required && i === 0}
				/>
				<span>{option}</span>
			</label>
		{/each}
	</fieldset>
{:else if fieldType === 'checkbox'}
	<fieldset class="form-field form-choice-group">
		<legend>
			{fieldName}
			{#if required}<span class="form-required" aria-hidden="true">*</span>{/if}
		</legend>
		{#each options as option}
			<label class="form-choice">
				<input
					type="checkbox"
					name={fieldId}
					value={option}
				/>
				<span>{option}</span>
			</label>
		{/each}
	</fieldset>
{:else}
	<div class="form-field">
		<label for={fieldId}>
			{fieldName}
			{#if required}<span class="form-required" aria-hidden="true">*</span>{/if}
		</label>
		<input
			type={fieldType}
			id={fieldId}
			name={fieldId}
			placeholder={placeholder}
			required={required}
		/>
	</div>
{/if}

<style>
	.form {
		margin: 1.5rem 0;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		max-width: 36rem;
	}

	.form :global(div[data-name="body"]) {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form :global(meta),
	.form :global(span[property]) {
		display: none;
	}

	/* Honeypot */
	.form-hp {
		position: absolute;
		left: -9999px;
		opacity: 0;
		height: 0;
		overflow: hidden;
	}

	/* Inline style variant */
	.form-inline :global(div[data-name="body"]) {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.75rem;
	}

	.form-inline .form-field {
		flex: 1;
		min-width: 10rem;
	}

	/* Compact style variant */
	.form-compact {
		gap: 0.75rem;
		font-size: 0.875rem;
	}

	.form-compact :global(div[data-name="body"]) {
		gap: 0.75rem;
	}

	.form-compact input,
	.form-compact textarea,
	.form-compact select {
		padding: 0.375rem 0.625rem;
		font-size: 0.8125rem;
	}

	/* Field */
	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.form-field label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text, #1f2937);
	}

	.form-required {
		color: var(--color-danger, #ef4444);
		margin-left: 0.125rem;
	}

	.form-field input,
	.form-field textarea,
	.form-field select {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border, #d1d5db);
		border-radius: var(--radius-md, 0.375rem);
		font-size: 0.9375rem;
		font-family: inherit;
		color: var(--color-text, #1f2937);
		background: var(--color-bg, #fff);
		transition: border-color 0.15s, box-shadow 0.15s;
		width: 100%;
		box-sizing: border-box;
	}

	.form-field input:focus,
	.form-field textarea:focus,
	.form-field select:focus {
		outline: none;
		border-color: var(--color-primary, #2563eb);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #2563eb) 15%, transparent);
	}

	.form-field textarea {
		resize: vertical;
		min-height: 6rem;
	}

	/* Fieldset */
	.form-fieldset {
		border: none;
		padding: 0;
		margin: 0.5rem 0 0;
	}

	.form-fieldset legend {
		font-size: 1.0625rem;
		font-weight: 700;
		color: var(--color-text, #1f2937);
		padding: 0;
		margin-bottom: 0.75rem;
	}

	/* Choice groups (radio/checkbox) */
	.form-choice-group {
		border: none;
		padding: 0;
	}

	.form-choice-group legend {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text, #1f2937);
		padding: 0;
		margin-bottom: 0.5rem;
	}

	.form-choice {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0;
		cursor: pointer;
		font-size: 0.9375rem;
	}

	.form-choice input {
		width: auto;
		margin: 0;
		accent-color: var(--color-primary, #2563eb);
	}

	/* Submit */
	.form-submit {
		padding: 0.625rem 1.5rem;
		background: var(--color-primary, #2563eb);
		color: white;
		border: none;
		border-radius: var(--radius-md, 0.375rem);
		font-size: 0.9375rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
		align-self: flex-start;
	}

	.form-submit:hover {
		background: color-mix(in srgb, var(--color-primary, #2563eb) 85%, black);
	}

	.form-submit:active {
		transform: scale(0.98);
	}

	/* Help & description text */
	.form-help {
		font-size: 0.8125rem;
		color: var(--color-muted, #6b7280);
		font-style: italic;
		margin: 0;
	}

	.form-text {
		font-size: 0.9375rem;
		color: var(--color-muted, #6b7280);
		margin: 0;
	}

	/* Separator */
	.form-separator {
		border: none;
		border-top: 1px solid var(--color-border, #e5e7eb);
		margin: 0.5rem 0;
	}

	/* Status messages */
	.form-status {
		padding: 0.75rem 1rem;
		border-radius: var(--radius-md, 0.375rem);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.form-status-submitting {
		background: var(--color-surface, #f9fafb);
		color: var(--color-muted, #6b7280);
	}

	.form-status-success {
		background: color-mix(in srgb, var(--color-success, #22c55e) 10%, transparent);
		color: var(--color-success, #15803d);
		border: 1px solid color-mix(in srgb, var(--color-success, #22c55e) 25%, transparent);
	}

	.form-status-error {
		background: color-mix(in srgb, var(--color-danger, #ef4444) 10%, transparent);
		color: var(--color-danger, #dc2626);
		border: 1px solid color-mix(in srgb, var(--color-danger, #ef4444) 25%, transparent);
	}
</style>
