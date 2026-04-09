import type { CleanupFn } from '../types.js';

/**
 * Juxtapose behavior for `[data-rune="juxtapose"]`.
 *
 * Provides interactive comparison between two panels via four variant modes:
 * - slider: draggable divider revealing one panel over the other
 * - toggle: button-based A/B switch between panels
 * - fade: hover/click crossfade between panels via opacity
 * - auto: scroll-triggered animation of the slider position
 */
export function juxtaposeBehavior(el: HTMLElement): CleanupFn {
	const variant = el.getAttribute('data-variant') || 'slider';

	switch (variant) {
		case 'toggle': return setupToggle(el);
		case 'fade': return setupFade(el);
		case 'auto': return setupAuto(el);
		default: return setupSlider(el);
	}
}

// ─── Shared helpers ───

function getPanels(el: HTMLElement): HTMLElement[] {
	const container = el.querySelector('[data-name="panels"]') || el;
	return Array.from(container.querySelectorAll<HTMLElement>(':scope > [data-rune="juxtapose-panel"]'));
}

function getPanelLabel(panel: HTMLElement): string {
	const span = panel.querySelector('[property="name"]');
	return span?.textContent?.trim() || '';
}

// ─── Slider ───

function setupSlider(el: HTMLElement): CleanupFn {
	const panels = getPanels(el);
	if (panels.length < 2) return () => {};

	const orientation = el.getAttribute('data-orientation') || 'vertical';
	const isHorizontal = orientation === 'horizontal';
	const panelsContainer = el.querySelector<HTMLElement>('[data-name="panels"]');
	if (!panelsContainer) return () => {};

	// Set up stacking layout
	panelsContainer.style.position = 'relative';
	panelsContainer.style.overflow = 'hidden';
	panels[0].style.position = 'absolute';
	panels[0].style.inset = '0';
	panels[0].style.zIndex = '2';
	// Force a compositing layer so clip-path correctly clips iframes on
	// mobile WebKit (without this, iframes can paint outside the clip).
	panels[0].style.willChange = 'clip-path';
	panels[1].style.position = 'relative';
	panels[1].style.zIndex = '1';

	// Ensure iframes inside juxtapose panels load eagerly — lazy-loaded
	// iframes behind a higher-z-index panel may never trigger loading on
	// mobile browsers that use simple visibility heuristics.
	for (const panel of panels) {
		for (const iframe of panel.querySelectorAll<HTMLIFrameElement>('iframe[loading="lazy"]')) {
			iframe.loading = 'eager';
		}
	}

	// Create divider
	const divider = document.createElement('div');
	divider.className = 'rf-juxtapose__divider';
	divider.setAttribute('role', 'slider');
	divider.setAttribute('aria-label', 'Comparison slider');
	divider.setAttribute('aria-valuemin', '0');
	divider.setAttribute('aria-valuemax', '100');
	divider.setAttribute('tabindex', '0');

	const handle = document.createElement('div');
	handle.className = 'rf-juxtapose__divider-handle';
	divider.appendChild(handle);
	panelsContainer.appendChild(divider);

	function setPosition(pct: number) {
		const clamped = Math.max(0, Math.min(100, pct));
		el.style.setProperty('--jx-position', String(clamped));
		divider.setAttribute('aria-valuenow', String(Math.round(clamped)));

		if (isHorizontal) {
			panels[0].style.clipPath = `inset(0 0 ${100 - clamped}% 0)`;
			divider.style.top = `${clamped}%`;
			divider.style.left = '';
		} else {
			panels[0].style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
			divider.style.left = `${clamped}%`;
			divider.style.top = '';
		}
	}

	// Set initial position
	const initial = parseFloat(el.style.getPropertyValue('--jx-position')) || 50;
	setPosition(initial);

	// Pointer drag handling
	let dragging = false;

	function pctFromEvent(e: PointerEvent): number {
		const rect = panelsContainer!.getBoundingClientRect();
		if (isHorizontal) {
			return ((e.clientY - rect.top) / rect.height) * 100;
		}
		return ((e.clientX - rect.left) / rect.width) * 100;
	}

	const onPointerDown = (e: PointerEvent) => {
		dragging = true;
		divider.setPointerCapture(e.pointerId);
		setPosition(pctFromEvent(e));
		e.preventDefault();
	};

	const onPointerMove = (e: PointerEvent) => {
		if (!dragging) return;
		setPosition(pctFromEvent(e));
	};

	const onPointerUp = (e: PointerEvent) => {
		if (!dragging) return;
		dragging = false;
		divider.releasePointerCapture(e.pointerId);
	};

	// Also allow clicking anywhere on the container to reposition
	const onContainerPointerDown = (e: PointerEvent) => {
		if (e.target === divider || divider.contains(e.target as Node)) return;
		dragging = true;
		divider.setPointerCapture(e.pointerId);
		setPosition(pctFromEvent(e));
	};

	divider.addEventListener('pointerdown', onPointerDown);
	divider.addEventListener('pointermove', onPointerMove);
	divider.addEventListener('pointerup', onPointerUp);
	panelsContainer.addEventListener('pointerdown', onContainerPointerDown);
	panelsContainer.addEventListener('pointermove', onPointerMove);
	panelsContainer.addEventListener('pointerup', onPointerUp);

	// Keyboard support
	const onKeyDown = (e: KeyboardEvent) => {
		const current = parseFloat(el.style.getPropertyValue('--jx-position')) || 50;
		const step = e.shiftKey ? 10 : 2;

		const decreaseKeys = isHorizontal ? ['ArrowUp'] : ['ArrowLeft'];
		const increaseKeys = isHorizontal ? ['ArrowDown'] : ['ArrowRight'];

		if (decreaseKeys.includes(e.key)) {
			setPosition(current - step);
			e.preventDefault();
		} else if (increaseKeys.includes(e.key)) {
			setPosition(current + step);
			e.preventDefault();
		} else if (e.key === 'Home') {
			setPosition(0);
			e.preventDefault();
		} else if (e.key === 'End') {
			setPosition(100);
			e.preventDefault();
		}
	};

	divider.addEventListener('keydown', onKeyDown);

	return () => {
		divider.removeEventListener('pointerdown', onPointerDown);
		divider.removeEventListener('pointermove', onPointerMove);
		divider.removeEventListener('pointerup', onPointerUp);
		panelsContainer!.removeEventListener('pointerdown', onContainerPointerDown);
		panelsContainer!.removeEventListener('pointermove', onPointerMove);
		panelsContainer!.removeEventListener('pointerup', onPointerUp);
		divider.removeEventListener('keydown', onKeyDown);
		divider.remove();

		// Restore panel styles
		panelsContainer!.style.position = '';
		panelsContainer!.style.overflow = '';
		for (const panel of panels) {
			panel.style.position = '';
			panel.style.inset = '';
			panel.style.zIndex = '';
			panel.style.clipPath = '';
			panel.style.willChange = '';
		}
	};
}

// ─── Toggle ───

function setupToggle(el: HTMLElement): CleanupFn {
	const panels = getPanels(el);
	if (panels.length < 2) return () => {};

	let activeIndex = 0;

	// Create toggle bar
	const toggleBar = document.createElement('div');
	toggleBar.className = 'rf-juxtapose__toggle-bar';
	toggleBar.setAttribute('role', 'radiogroup');
	toggleBar.setAttribute('aria-label', 'Comparison toggle');

	const buttons: HTMLButtonElement[] = panels.map((panel, i) => {
		const btn = document.createElement('button');
		btn.className = 'rf-juxtapose__toggle-btn';
		btn.setAttribute('role', 'radio');
		btn.textContent = getPanelLabel(panel) || `Panel ${i + 1}`;
		toggleBar.appendChild(btn);
		return btn;
	});

	// Insert toggle bar before panels container
	const panelsContainer = el.querySelector('[data-name="panels"]');
	if (panelsContainer) {
		panelsContainer.parentNode!.insertBefore(toggleBar, panelsContainer);
	} else {
		el.insertBefore(toggleBar, el.firstChild);
	}

	function render() {
		panels.forEach((panel, i) => {
			const isActive = i === activeIndex;
			panel.hidden = !isActive;
			panel.setAttribute('data-state', isActive ? 'active' : 'inactive');
		});
		buttons.forEach((btn, i) => {
			const active = i === activeIndex;
			btn.setAttribute('aria-checked', String(active));
			btn.setAttribute('data-state', active ? 'active' : 'inactive');
			btn.classList.toggle('rf-juxtapose__toggle-btn--active', active);
		});
	}

	const onClick = (e: Event) => {
		const btn = (e.target as HTMLElement).closest('.rf-juxtapose__toggle-btn');
		if (!btn) return;
		const idx = buttons.indexOf(btn as HTMLButtonElement);
		if (idx >= 0) {
			activeIndex = idx;
			render();
		}
	};

	toggleBar.addEventListener('click', onClick);
	render();

	return () => {
		toggleBar.removeEventListener('click', onClick);
		toggleBar.remove();

		// Restore panel visibility and state
		for (const panel of panels) {
			panel.hidden = false;
			panel.removeAttribute('data-state');
		}
	};
}

// ─── Fade ───

function setupFade(el: HTMLElement): CleanupFn {
	const panels = getPanels(el);
	if (panels.length < 2) return () => {};

	const panelsContainer = el.querySelector<HTMLElement>('[data-name="panels"]');
	if (!panelsContainer) return () => {};

	const duration = parseInt(el.style.getPropertyValue('--jx-duration') || '1000', 10);

	// Stack panels
	panelsContainer.style.position = 'relative';
	panels[0].style.position = 'relative';
	panels[0].style.zIndex = '1';
	panels[1].style.position = 'absolute';
	panels[1].style.inset = '0';
	panels[1].style.zIndex = '2';
	panels[1].style.opacity = '0';
	panels[1].style.transition = `opacity ${duration}ms ease`;

	// Ensure iframes load eagerly (hidden panel may not trigger lazy load)
	for (const panel of panels) {
		for (const iframe of panel.querySelectorAll<HTMLIFrameElement>('iframe[loading="lazy"]')) {
			iframe.loading = 'eager';
		}
	}

	let locked = false;

	const onEnter = () => {
		if (!locked) {
			panels[1].style.opacity = '1';
		}
	};

	const onLeave = () => {
		if (!locked) {
			panels[1].style.opacity = '0';
		}
	};

	const onClick = () => {
		locked = !locked;
		panels[1].style.opacity = locked ? '1' : '0';
	};

	panelsContainer.addEventListener('mouseenter', onEnter);
	panelsContainer.addEventListener('mouseleave', onLeave);
	panelsContainer.addEventListener('click', onClick);

	// Announce state changes for accessibility
	panelsContainer.setAttribute('aria-live', 'polite');

	return () => {
		panelsContainer.removeEventListener('mouseenter', onEnter);
		panelsContainer.removeEventListener('mouseleave', onLeave);
		panelsContainer.removeEventListener('click', onClick);
		panelsContainer.removeAttribute('aria-live');

		// Restore styles
		panelsContainer.style.position = '';
		for (const panel of panels) {
			panel.style.position = '';
			panel.style.inset = '';
			panel.style.zIndex = '';
			panel.style.opacity = '';
			panel.style.transition = '';
		}
	};
}

// ─── Auto ───

function setupAuto(el: HTMLElement): CleanupFn {
	const panels = getPanels(el);
	if (panels.length < 2) return () => {};

	const orientation = el.getAttribute('data-orientation') || 'vertical';
	const isHorizontal = orientation === 'horizontal';
	const panelsContainer = el.querySelector<HTMLElement>('[data-name="panels"]');
	if (!panelsContainer) return () => {};

	const targetPosition = parseFloat(el.style.getPropertyValue('--jx-position')) || 50;
	const duration = parseInt(el.style.getPropertyValue('--jx-duration') || '1000', 10);

	// Set up stacking (same as slider)
	panelsContainer.style.position = 'relative';
	panelsContainer.style.overflow = 'hidden';
	panels[0].style.position = 'absolute';
	panels[0].style.inset = '0';
	panels[0].style.zIndex = '2';
	panels[0].style.willChange = 'clip-path';
	panels[1].style.position = 'relative';
	panels[1].style.zIndex = '1';

	// Ensure iframes load eagerly (same rationale as slider)
	for (const panel of panels) {
		for (const iframe of panel.querySelectorAll<HTMLIFrameElement>('iframe[loading="lazy"]')) {
			iframe.loading = 'eager';
		}
	}

	function setClip(pct: number) {
		el.style.setProperty('--jx-position', String(pct));
		if (isHorizontal) {
			panels[0].style.clipPath = `inset(0 0 ${100 - pct}% 0)`;
		} else {
			panels[0].style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
		}
	}

	// Start from 0
	setClip(0);

	let animationId: number | null = null;
	let hasPlayed = false;

	function animate() {
		if (hasPlayed) return;
		hasPlayed = true;

		const startTime = performance.now();
		const startPos = 0;

		function tick(now: number) {
			const elapsed = now - startTime;
			const progress = Math.min(elapsed / duration, 1);
			// Ease-out cubic
			const eased = 1 - Math.pow(1 - progress, 3);
			setClip(startPos + (targetPosition - startPos) * eased);

			if (progress < 1) {
				animationId = requestAnimationFrame(tick);
			}
		}

		animationId = requestAnimationFrame(tick);
	}

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					animate();
				}
			}
		},
		{ threshold: 0.3 },
	);

	observer.observe(el);

	return () => {
		observer.disconnect();
		if (animationId !== null) cancelAnimationFrame(animationId);

		// Restore styles
		panelsContainer!.style.position = '';
		panelsContainer!.style.overflow = '';
		for (const panel of panels) {
			panel.style.position = '';
			panel.style.inset = '';
			panel.style.zIndex = '';
			panel.style.clipPath = '';
			panel.style.willChange = '';
		}
	};
}
