import { useRef } from "react";
import { useMultiplierLoop } from "#/game/multiplier";

export interface MultiplierDisplayProps {
	startTimeMs: number | null;
	growthRate: number | null;
	running: boolean;
	clockOffsetMs?: number;
	frozenAtHundredths?: number | null;
}

export function MultiplierDisplay({
	startTimeMs,
	growthRate,
	running,
	clockOffsetMs = 0,
	frozenAtHundredths,
}: MultiplierDisplayProps) {
	const ref = useRef<HTMLSpanElement>(null);

	useMultiplierLoop({
		startTimeMs,
		growthRate,
		clockOffsetMs,
		running: running && frozenAtHundredths == null,
		onFrame: (m) => {
			if (!ref.current) return;
			const capped = frozenAtHundredths
				? Math.min(m, frozenAtHundredths / 100)
				: m;
			ref.current.textContent = `${capped.toFixed(2)}x`;
		},
	});

	const initial =
		frozenAtHundredths !== null && frozenAtHundredths !== undefined
			? `${(frozenAtHundredths / 100).toFixed(2)}x`
			: "1.00x";

	return (
		<span ref={ref} className="font-mono text-3xl tabular-nums">
			{initial}
		</span>
	);
}
