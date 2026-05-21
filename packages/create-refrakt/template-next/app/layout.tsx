import '@refrakt-md/lumina';
import { getSiteTokensCss } from '@refrakt-md/next';
import type { ReactNode } from 'react';

// Site-level token overrides (SPEC-048 + SPEC-056). Computed once per request
// in the Server Component scope; the resulting CSS layers on top of the
// theme package's barrel so `--rf-*` overrides resolve last.
const siteTokensCssPromise = getSiteTokensCss();

export default async function RootLayout({ children }: { children: ReactNode }) {
	const siteTokensCss = await siteTokensCssPromise;
	return (
		<html lang="en">
			<head>
				{siteTokensCss && (
					<style dangerouslySetInnerHTML={{ __html: siteTokensCss }} />
				)}
			</head>
			<body>{children}</body>
		</html>
	);
}
