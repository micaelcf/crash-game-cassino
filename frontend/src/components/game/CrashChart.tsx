import {
	AnimatePresence,
	motion,
	useMotionValue,
	useReducedMotion,
	useTransform,
} from "motion/react";
import { useEffect, useRef } from "react";
import { RoundStatus } from "#/lib/api/types";
import { useMultiplierLoop } from "#/lib/domain/multiplier";
import { useThemeTokens } from "#/lib/useThemeTokens";
import { FormulaPopover } from "./FormulaPopover";

export type ChartPhase = RoundStatus | "IDLE";

export interface CrashChartProps {
	phase: ChartPhase;
	startTimeMs: number | null;
	growthRate: number | null;
	clockOffsetMs?: number;
	frozenAtHundredths?: number | null;
	roundId?: string;
}

const WIDTH = 800;
const HEIGHT = 420;
const PADDING_LEFT = 56;
const PADDING_BOTTOM = 44;
const PADDING_TOP = 56;
const PADDING_RIGHT = 24;

const PLOT_W = WIDTH - PADDING_LEFT - PADDING_RIGHT;
const PLOT_H = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

const VIEW_SECONDS_MIN = 12;
const VIEW_MULT_MIN = 4;
const GRID_DIVISIONS = 4;
const SR_LIVE_INTERVAL_MS = 500;

// Where the live dot sits inside the plot, as a fraction of the viewport
// (0 = top-left origin, 1 = bottom-right). Viewport grows continuously each
// frame so the dot stays at exactly this fraction — no discrete jumps,
// no thresholded resizes. Higher = dot closer to the edge, more curve visible
// to the left; lower = more headroom on top, dot drifts further from corner.
const HEADROOM_FRAC = 0.85;

export function CrashChart({
	phase,
	startTimeMs,
	growthRate,
	clockOffsetMs = 0,
	frozenAtHundredths,
	roundId,
}: CrashChartProps) {
	const tokens = useThemeTokens();
	const reducedMotion = useReducedMotion() ?? false;
	const multiplier = useMotionValue(1);
	const elapsedSec = useMotionValue(0);

	const pathRef = useRef<SVGPathElement>(null);
	const dotRef = useRef<SVGCircleElement>(null);
	const labelRef = useRef<HTMLSpanElement>(null);
	const srRef = useRef<HTMLSpanElement>(null);
	const lastSrAtRef = useRef(0);

	// Track whether we actually witnessed the round in FLYING this mount.
	// Used to suppress the crash overlay when the page lands directly in
	// CRASHED (page refresh between rounds, backend serving stale crashed
	// round as "current"). The overlay only makes sense as a transition cue.
	const sawFlyingRef = useRef(false);

	// Live viewport bounds. Stored as refs so the rAF loop can mutate
	// without re-rendering React (60fps re-render = death).
	const viewMultRef = useRef(VIEW_MULT_MIN);
	const viewSecondsRef = useRef(VIEW_SECONDS_MIN);

	// Y-axis label text nodes, indexed top→bottom. Updated in the same
	// rAF tick as the curve so the grid follows viewport growth without
	// any re-render.
	const gridLabelRefs = useRef<(SVGTextElement | null)[]>([]);

	useEffect(() => {
		if (phase === RoundStatus.FLYING) sawFlyingRef.current = true;
		if (phase === RoundStatus.BETTING_PHASE) sawFlyingRef.current = false;
		if (phase !== RoundStatus.FLYING) {
			multiplier.set(frozenAtHundredths ? frozenAtHundredths / 100 : 1);
			elapsedSec.set(0);
		}
		// Reset viewport when round ends. For CRASHED, expand once to fit the
		// final crash point so the frozen curve is fully visible.
		if (phase === RoundStatus.CRASHED && frozenAtHundredths != null) {
			const crashMult = frozenAtHundredths / 100;
			viewMultRef.current = Math.max(
				VIEW_MULT_MIN,
				(crashMult - 1) / HEADROOM_FRAC + 1,
			);
		} else if (phase !== RoundStatus.FLYING) {
			viewMultRef.current = VIEW_MULT_MIN;
			viewSecondsRef.current = VIEW_SECONDS_MIN;
		}
	}, [phase, frozenAtHundredths, multiplier, elapsedSec]);

	useMultiplierLoop({
		startTimeMs,
		growthRate,
		clockOffsetMs,
		running:
			phase === RoundStatus.FLYING &&
			frozenAtHundredths == null &&
			!reducedMotion,
		onFrame: (m) => {
			multiplier.set(m);
			if (startTimeMs != null) {
				elapsedSec.set((Date.now() - clockOffsetMs - startTimeMs) / 1000);
			}
		},
	});

	useEffect(() => {
		const update = () => {
			const m = multiplier.get();
			const t = elapsedSec.get();

			// Continuous viewport: derive the target each frame from the current
			// multiplier/elapsed so the dot sits at exactly HEADROOM_FRAC of the
			// plot. Solve mNorm = HEADROOM_FRAC for viewMult given m:
			//   mNorm = (m - 1) / (viewMult - 1) = HEADROOM_FRAC
			//   ⇒ viewMult = (m - 1) / HEADROOM_FRAC + 1
			// Only grow (never shrink during flight) — shrinking would compress
			// the past curve and yank everything visually.
			const targetMult = Math.max(VIEW_MULT_MIN, (m - 1) / HEADROOM_FRAC + 1);
			if (targetMult > viewMultRef.current) {
				viewMultRef.current = targetMult;
			}
			const targetSeconds = Math.max(VIEW_SECONDS_MIN, t / HEADROOM_FRAC);
			if (targetSeconds > viewSecondsRef.current) {
				viewSecondsRef.current = targetSeconds;
			}

			const viewMult = viewMultRef.current;
			const viewSeconds = viewSecondsRef.current;

			const { d, x, y } = buildCurve(t, m, viewMult, viewSeconds);
			if (pathRef.current) pathRef.current.setAttribute("d", d);
			if (dotRef.current) {
				dotRef.current.setAttribute("cx", String(x));
				dotRef.current.setAttribute("cy", String(y));
			}
			if (labelRef.current) labelRef.current.textContent = `${m.toFixed(2)}x`;

			// Repaint Y-axis labels to match the new viewport.
			for (let i = 0; i <= GRID_DIVISIONS; i++) {
				const node = gridLabelRefs.current[i];
				if (!node) continue;
				const f = i / GRID_DIVISIONS;
				const label = viewMult - f * (viewMult - 1);
				node.textContent = `${label.toFixed(label >= 100 ? 0 : label >= 10 ? 1 : 2)}x`;
			}

			const now = Date.now();
			if (srRef.current && now - lastSrAtRef.current > SR_LIVE_INTERVAL_MS) {
				lastSrAtRef.current = now;
				srRef.current.textContent = `Multiplier ${m.toFixed(2)} times`;
			}
		};
		const unsubM = multiplier.on("change", update);
		const unsubT = elapsedSec.on("change", update);
		update();
		return () => {
			unsubM();
			unsubT();
		};
	}, [multiplier, elapsedSec]);

	const labelColor = useTransform(
		multiplier,
		[1, 2, 5, 10],
		[
			tokens["--color-accent-cyan"],
			tokens["--color-secondary"],
			tokens["--color-primary"],
			tokens["--color-accent-pink"],
		],
	);

	return (
		<div className="relative h-full w-full overflow-hidden rounded-(--radius-card) border border-border/70 bg-bg-1 shadow-(--shadow-card)">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,var(--color-primary)/8%,transparent_60%)]" />

			<div className="absolute inset-x-0 top-0 z-10 flex h-14 items-center justify-between px-4 sm:px-6">
				<div className="flex items-center gap-2">
					<PhaseTag phase={phase} reducedMotion={reducedMotion} />
					<FormulaPopover growthRate={growthRate} roundId={roundId} />
				</div>
				<motion.span
					ref={labelRef}
					aria-hidden="true"
					className="font-mono text-5xl font-black tabular-nums leading-none sm:text-6xl"
					style={{ color: labelColor }}>
					1.00x
				</motion.span>
				<span className="hidden text-[10px] font-bold uppercase tracking-[0.35em] text-fg-dim sm:inline">
					Live
				</span>
			</div>

			<span ref={srRef} className="sr-only" aria-live="polite" />

			<svg
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				preserveAspectRatio="xMidYMid meet"
				className="h-full w-full"
				aria-hidden="true">
				<defs>
					<linearGradient id="curveGradient" x1="0" y1="0" x2="1" y2="0">
						<stop
							offset="0%"
							stopColor={tokens["--color-accent-cyan"]}
							stopOpacity="0.3"
						/>
						<stop
							offset="40%"
							stopColor={tokens["--color-secondary"]}
							stopOpacity="0.7"
						/>
						<stop
							offset="75%"
							stopColor={tokens["--color-primary"]}
							stopOpacity="0.95"
						/>
						<stop
							offset="100%"
							stopColor={tokens["--color-accent-pink"]}
							stopOpacity="1"
						/>
					</linearGradient>
					<linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
						<stop
							offset="0%"
							stopColor={tokens["--color-primary"]}
							stopOpacity="0.25"
						/>
						<stop
							offset="100%"
							stopColor={tokens["--color-primary"]}
							stopOpacity="0"
						/>
					</linearGradient>
				</defs>

				<Grid
					borderColor={tokens["--color-border"]}
					dimColor={tokens["--color-fg-dim"]}
					labelRefs={gridLabelRefs}
				/>

				<path
					ref={pathRef}
					d=""
					fill="none"
					stroke="url(#curveGradient)"
					strokeWidth={3.5}
					strokeLinecap="round"
				/>
				<circle
					ref={dotRef}
					cx={PADDING_LEFT}
					cy={HEIGHT - PADDING_BOTTOM}
					r={7}
					fill={tokens["--color-primary"]}
				/>
			</svg>

			<AnimatePresence>
				{phase === RoundStatus.CRASHED && sawFlyingRef.current && (
					<motion.div
						key="crash-flash"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.35 }}
						className="pointer-events-none absolute inset-0 flex items-center justify-center bg-danger/15 backdrop-blur-[2px]">
						<motion.div
							initial={{ scale: 0.6, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ type: "spring", stiffness: 220, damping: 14 }}
							className="rounded-(--radius-card) border border-danger bg-bg-0/85 px-8 py-4 text-center shadow-(--shadow-glow-pink)">
							<p className="text-xs font-bold uppercase tracking-[0.4em] text-danger">
								Crashed
							</p>
							<p className="font-mono text-4xl font-black text-danger">
								{frozenAtHundredths
									? (frozenAtHundredths / 100).toFixed(2)
									: "—"}
								x
							</p>
						</motion.div>
					</motion.div>
				)}
				{phase === RoundStatus.BETTING_PHASE && (
					<motion.div
						key="betting-overlay"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0 }}
						className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
						<span className="rounded-pill bg-bg-2/95 px-5 py-2 text-xs font-bold uppercase tracking-[0.3em] text-primary ring-1 ring-inset ring-primary/40 backdrop-blur-sm">
							Place your bets
						</span>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

function Grid({
	borderColor,
	dimColor,
	labelRefs,
}: {
	borderColor: string;
	dimColor: string;
	labelRefs: React.MutableRefObject<(SVGTextElement | null)[]>;
}) {
	const verticals = [0, 0.25, 0.5, 0.75, 1];
	const horizontals = Array.from(
		{ length: GRID_DIVISIONS + 1 },
		(_, i) => i / GRID_DIVISIONS,
	);
	return (
		<g>
			{verticals.map((p) => {
				const x = PADDING_LEFT + p * PLOT_W;
				return (
					<line
						key={`v-${p}`}
						x1={x}
						x2={x}
						y1={PADDING_TOP}
						y2={HEIGHT - PADDING_BOTTOM}
						stroke={borderColor}
						strokeWidth={1}
						strokeDasharray="2 6"
						opacity={0.35}
					/>
				);
			})}
			{horizontals.map((p, i) => {
				const y = PADDING_TOP + p * PLOT_H;
				const initialMult = VIEW_MULT_MIN - p * (VIEW_MULT_MIN - 1);
				return (
					<g key={`h-${p}`}>
						<line
							x1={PADDING_LEFT}
							x2={WIDTH - PADDING_RIGHT}
							y1={y}
							y2={y}
							stroke={borderColor}
							strokeWidth={1}
							strokeDasharray="2 6"
							opacity={0.35}
						/>
						<text
							ref={(node) => {
								labelRefs.current[i] = node;
							}}
							x={PADDING_LEFT - 10}
							y={y + 4}
							textAnchor="end"
							fontSize={11}
							fontWeight={600}
							fill={dimColor}
							fontFamily="JetBrains Mono, ui-monospace, monospace">
							{initialMult.toFixed(1)}x
						</text>
					</g>
				);
			})}
		</g>
	);
}

function PhaseTag({
	phase,
	reducedMotion,
}: {
	phase: ChartPhase;
	reducedMotion: boolean;
}) {
	const map: Record<
		ChartPhase,
		{ label: string; varName: string; pulse: boolean }
	> = {
		[RoundStatus.BETTING_PHASE]: {
			label: "Betting",
			varName: "--color-accent-cyan",
			pulse: !reducedMotion,
		},
		[RoundStatus.FLYING]: {
			label: "Flying",
			varName: "--color-secondary",
			pulse: !reducedMotion,
		},
		[RoundStatus.CRASHED]: {
			label: "Crashed",
			varName: "--color-danger",
			pulse: false,
		},
		IDLE: { label: "Idle", varName: "--color-fg-dim", pulse: false },
	};
	const m = map[phase] ?? map.IDLE;
	return (
		<span
			className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.35em]"
			style={{ color: `var(${m.varName})` }}>
			<motion.span
				className="size-1.5 rounded-full"
				style={{ backgroundColor: `var(${m.varName})` }}
				animate={m.pulse ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
				transition={{ repeat: m.pulse ? Infinity : 0, duration: 1.3 }}
			/>
			{m.label}
		</span>
	);
}

function buildCurve(
	elapsed: number,
	multiplier: number,
	viewMult: number,
	viewSeconds: number,
): { d: string; x: number; y: number } {
	const tNorm = clamp01(elapsed / viewSeconds);
	const mNorm = clamp01((multiplier - 1) / (viewMult - 1));

	const cx = PADDING_LEFT + tNorm * PLOT_W;
	const cy = HEIGHT - PADDING_BOTTOM - mNorm * PLOT_H;

	const segments = 32;
	const points: string[] = [];
	for (let i = 0; i <= segments; i++) {
		const f = i / segments;
		const localT = f * tNorm;
		const localM = multiplier ** f;
		const lmNorm = clamp01((localM - 1) / (viewMult - 1));
		const px = PADDING_LEFT + localT * PLOT_W;
		const py = HEIGHT - PADDING_BOTTOM - lmNorm * PLOT_H;
		points.push(`${i === 0 ? "M" : "L"} ${px.toFixed(2)} ${py.toFixed(2)}`);
	}

	return { d: points.join(" "), x: cx, y: cy };
}

function clamp01(n: number): number {
	if (n < 0) return 0;
	if (n > 1) return 1;
	return n;
}
