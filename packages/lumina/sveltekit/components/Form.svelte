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
		? tag.attributes['data-style'] || 'stacked'
		: 'stacked';
	const honeypot = isForm
		? tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'honeypot')?.attributes?.content !== 'false'
		: true;

	// FormField properties
	const fieldName = !isForm
		? tag.children.find((c: any) => c?.name === 'span' && c?.attributes?.property === 'name')?.children?.[0] || ''
		: '';
	const fieldType = !isForm
		? tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'fieldType')?.attributes?.content
			|| 'text'
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
		class="rf-form {formStyle !== 'stacked' ? `rf-form--${formStyle}` : ''}"
		action={action}
		method={method}
		onsubmit={handleSubmit}
	>
		{#if honeypot}
			<div class="rf-form__hp" aria-hidden="true">
				<input type="text" name="_gotcha" autocomplete="off" tabindex={-1} />
			</div>
		{/if}
		{@render children()}
		{#if status === 'submitting'}
			<div class="rf-form__status rf-form__status--submitting" role="status">Submitting...</div>
		{:else if status === 'success'}
			<div class="rf-form__status rf-form__status--success" role="alert">{statusMessage}</div>
		{:else if status === 'error'}
			<div class="rf-form__status rf-form__status--error" role="alert">{statusMessage}</div>
		{/if}
	</form>
{:else if fieldType === 'group'}
	<fieldset class="rf-form-fieldset">
		<legend>{fieldName}</legend>
		{@render children()}
	</fieldset>
{:else if fieldType === 'submit'}
	<button type="submit" class="rf-form__submit">{fieldName}</button>
{:else if fieldType === 'separator'}
	<hr class="rf-form__separator" />
{:else if fieldType === 'help'}
	<p class="rf-form__help">{fieldName}</p>
{:else if fieldType === 'description'}
	<p class="rf-form__text">{fieldName}</p>
{:else if fieldType === 'textarea'}
	<div class="rf-form-field">
		<label for={fieldId}>
			{fieldName}
			{#if required}<span class="rf-form-field__required" aria-hidden="true">*</span>{/if}
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
	<div class="rf-form-field">
		<label for={fieldId}>
			{fieldName}
			{#if required}<span class="rf-form-field__required" aria-hidden="true">*</span>{/if}
		</label>
		<select id={fieldId} name={fieldId} required={required}>
			<option value="" disabled selected>Select an option</option>
			{#each options as option}
				<option value={option}>{option}</option>
			{/each}
		</select>
	</div>
{:else if fieldType === 'radio'}
	<fieldset class="rf-form-field rf-form-choice-group">
		<legend>
			{fieldName}
			{#if required}<span class="rf-form-field__required" aria-hidden="true">*</span>{/if}
		</legend>
		{#each options as option, i}
			<label class="rf-form-choice">
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
	<fieldset class="rf-form-field rf-form-choice-group">
		<legend>
			{fieldName}
			{#if required}<span class="rf-form-field__required" aria-hidden="true">*</span>{/if}
		</legend>
		{#each options as option}
			<label class="rf-form-choice">
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
	<div class="rf-form-field">
		<label for={fieldId}>
			{fieldName}
			{#if required}<span class="rf-form-field__required" aria-hidden="true">*</span>{/if}
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
