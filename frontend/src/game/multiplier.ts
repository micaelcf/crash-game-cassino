import { useEffect, useRef } from "react";

export interface ProjectionParams {
	startTimeMs: number;
	growthRate: number;
	now: number;
	clockOffsetMs?: number;
}

export function projectMultiplier({
	startTimeMs,
	growthRate,
	now,
	clockOffsetMs = 0,
}: ProjectionParams): number {
	const elapsedSec = (now - clockOffsetMs - startTimeMs) / 1000;
	if (elapsedSec <= 0) return 1;
	return Math.exp(growthRate * elapsedSec);
}

export interface MultiplierLoopOptions {
	startTimeMs: number | null;
	growthRate: number | null;
	clockOffsetMs?: number;
	running: boolean;
	onFrame: (multiplier: number) => void;
}

export function useMultiplierLoop({
	startTimeMs,
	growthRate,
	clockOffsetMs = 0,
	running,
	onFrame,
}: MultiplierLoopOptions): void {
	const frameRef = useRef<number | null>(null);
	const callbackRef = useRef(onFrame);
	callbackRef.current = onFrame;

	useEffect(() => {
		if (
			!running ||
			startTimeMs === null ||
			growthRate === null ||
			typeof window === "undefined"
		) {
			return;
		}

		const tick = () => {
			const m = projectMultiplier({
				startTimeMs,
				growthRate,
				now: Date.now(),
				clockOffsetMs,
			});
			callbackRef.current(m);
			frameRef.current = window.requestAnimationFrame(tick);
		};

		frameRef.current = window.requestAnimationFrame(tick);

		return () => {
			if (frameRef.current !== null) {
				window.cancelAnimationFrame(frameRef.current);
				frameRef.current = null;
			}
		};
	}, [running, startTimeMs, growthRate, clockOffsetMs]);
}
