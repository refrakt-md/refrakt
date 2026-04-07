'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface BehaviorInitProps {
	pages: Array<{
		url: string;
		title: string;
		draft: boolean;
		description?: string;
		date?: string;
		author?: string;
		tags?: string[];
		image?: string;
		version?: string;
		versionGroup?: string;
	}>;
	currentUrl: string;
}

/**
 * Client component that initializes interactive rune behaviors.
 *
 * Renders nothing — manages behavior lifecycle via useEffect.
 * Automatically re-initializes on client-side navigation.
 */
export function BehaviorInit({ pages, currentUrl }: BehaviorInitProps) {
	const pathname = usePathname();

	useEffect(() => {
		let cleanup: (() => void) | undefined;

		import('@refrakt-md/behaviors').then(({ registerElements, RfContext, initRuneBehaviors, initLayoutBehaviors }) => {
			RfContext.pages = pages;
			RfContext.currentUrl = pathname ?? currentUrl;
			registerElements();
			const cleanupRunes = initRuneBehaviors();
			const cleanupLayout = initLayoutBehaviors();
			cleanup = () => {
				cleanupRunes();
				cleanupLayout();
			};
		});

		return () => {
			cleanup?.();
		};
	}, [pathname, pages, currentUrl]);

	return null;
}
