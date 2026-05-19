import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { RoundStatus } from "#/lib/api/types";

export interface PhaseTimerProps {
	phase: RoundStatus | "IDLE";
	bettingEndsAt: string | null;
	clockOffsetMs?: number;
}

const RADIUS = 16;
const STROKE = 3;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function PhaseTimer({
	phase,
	bettingEndsAt,
	clockOffsetMs = 0,
}: PhaseTimerProps) {
	const reducedMotion = useReducedMotion() ?? false;
	const [remainingMs, setRemainingMs] = useState<number>(0);

	useEffect(() => {
		if (phase !== RoundStatus.BETTING_PHASE || !bettingEndsAt) {
			setRemainingMs(0);
			return;
		}
		const endMs = Date.parse(bettingEndsAt);
		let raf: number;
		const tick = () => {
			const now = Date.now() - clockOffsetMs;
			setRemainingMs(Math.max(0, endMs - now));
			raf = window.requestAnimationFrame(tick);
		};
		raf = window.requestAnimationFrame(tick);
		return () => window.cancelAnimationFrame(raf);
	}, [phase, bettingEndsAt, clockOffsetMs]);

	if (phase !== RoundStatus.BETTING_PHASE) return null;

	const seconds = remainingMs / 1000;
	const pct = Math.min(1, Math.max(0, seconds / 10));
	const dash = CIRCUMFERENCE * pct;
	const urgent = seconds < 3;

	return (
		<div className="flex items-center gap-3 rounded-pill bg-bg-1 px-3 py-1.5 ring-1 ring-inset ring-border">
			<div className="relative size-10">
				<svg
					viewBox="0 0 40 40"
					className="size-10 -rotate-90"
					aria-hidden="true">
					<circle
						cx="20"
						cy="20"
						r={RADIUS}
						stroke="var(--color-bg-2)"
						strokeWidth={STROKE}
						fill="none"
					/>
					<circle
						cx="20"
						cy="20"
						r={RADIUS}
						stroke={urgent ? "var(--color-danger)" : "var(--color-primary)"}
						strokeWidth={STROKE}
						strokeLinecap="round"
						fill="none"
						strokeDasharray={CIRCUMFERENCE}
						strokeDashoffset={CIRCUMFERENCE - dash}
						style={{ transition: "stroke-dashoffset 0.08s linear" }}
					/>
				</svg>
				<motion.span
					className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-black tabular-nums"
					style={{ color: urgent ? "var(--color-danger)" : "var(--color-fg)" }}
					animate={
						urgent && !reducedMotion ? { scale: [1, 1.12, 1] } : { scale: 1 }
					}
					transition={{ repeat: urgent ? Infinity : 0, duration: 0.6 }}>
					{Math.ceil(seconds)}
				</motion.span>
			</div>
			<div className="flex flex-col leading-tight">
				<span className="text-[9px] font-bold uppercase tracking-[0.25em] text-fg-dim">
					Next round
				</span>
				<span className="font-mono text-[11px] tabular-nums text-fg-muted">
					{seconds.toFixed(1)}s
				</span>
			</div>
		</div>
	);
}
