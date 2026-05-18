import { ArrowRightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Tooltip } from "#/components/ui";
import type { RoundDto } from "#/lib/api/types";
import { formatMultiplier } from "#/lib/domain/money";
import {
	TONE_BG_SOFT,
	TONE_TEXT,
	toneForHundredths,
} from "#/lib/domain/multiplier-tone";

export interface HistoryStripProps {
	rounds: RoundDto[];
}

export function HistoryStrip({ rounds }: HistoryStripProps) {
	if (rounds.length === 0) {
		return (
			<div className="flex h-12 items-center justify-center rounded-(--radius-card) bg-(--color-bg-1) text-xs text-(--color-fg-dim) ring-1 ring-inset ring-(--color-border)/70">
				No history yet.
			</div>
		);
	}

	return (
		<div className="relative">
			<div
				className="flex gap-1.5 overflow-x-auto rounded-(--radius-card) bg-(--color-bg-1) p-2.5 ring-1 ring-inset ring-(--color-border)/70 shadow-(--shadow-card)"
				style={{
					maskImage:
						"linear-gradient(90deg, transparent 0, #000 24px, #000 calc(100% - 80px), transparent 100%)",
					scrollSnapType: "x mandatory",
				}}
			>
				{rounds.map((r, i) => {
					const h = r.crashPointHundredths ?? 100;
					const tone = toneForHundredths(h);
					return (
						<Tooltip
							key={r.id}
							label={`Round ${r.id.slice(0, 8)} • crash @ ${formatMultiplier(h)}`}
						>
							<motion.span
								initial={{ scale: 0.85, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								transition={{
									type: "spring",
									stiffness: 280,
									damping: 22,
									delay: Math.min(i * 0.015, 0.3),
								}}
								className={`flex h-9 min-w-[3.75rem] shrink-0 items-center justify-center rounded-(--radius-control) px-2 font-mono text-xs font-black tabular-nums scroll-snap-align-start ${TONE_BG_SOFT[tone]} ${TONE_TEXT[tone]}`}
							>
								{(h / 100).toFixed(2)}x
							</motion.span>
						</Tooltip>
					);
				})}
				<Link
					to="/history"
					className="flex h-9 shrink-0 items-center justify-center gap-1 rounded-(--radius-control) bg-(--color-bg-2) px-3 text-xs font-bold text-(--color-fg-muted) transition-colors hover:bg-(--color-primary)/15 hover:text-(--color-primary)"
				>
					All
					<ArrowRightIcon size={12} weight="bold" />
				</Link>
			</div>
		</div>
	);
}
