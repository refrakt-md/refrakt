import type { HeroProps } from '../generated/shapes';

export function Hero({
	align,
	mediaPosition,
	eyebrow,
	slotHeadline,
	slotBlurb,
	slotMedia,
	actions,
}: HeroProps) {
	return (
		<section className="hero" data-align={align} data-media={mediaPosition}>
			<div className="hero__content">
				{eyebrow && <p className="hero__eyebrow">{eyebrow}</p>}
				<h1 className="hero__headline">{slotHeadline}</h1>
				{slotBlurb && <p className="hero__blurb">{slotBlurb}</p>}
				{actions && (
					<div className="hero__actions">
						{actions.map((a, i) => (
							<a key={a.href} href={a.href} className={i === 0 ? 'button primary' : 'button'}>
								{a.label}
							</a>
						))}
					</div>
				)}
			</div>
			{slotMedia && <div className="hero__media">{slotMedia}</div>}
		</section>
	);
}
