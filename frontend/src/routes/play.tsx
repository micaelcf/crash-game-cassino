import { ShieldCheckIcon, TrophyIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { BetPanel } from "#/components/game/BetPanel";
import { CrashChart } from "#/components/game/CrashChart";
import { HistoryStrip } from "#/components/game/HistoryStrip";
import { LeaderboardMini } from "#/components/game/LeaderboardMini";
import { PhaseTimer } from "#/components/game/PhaseTimer";
import { PlayerHeader } from "#/components/game/PlayerHeader";
import { RoundBets } from "#/components/game/RoundBets";
import { AppShell } from "#/components/shared/AppShell";
import { Drawer } from "#/components/ui";
import { RoundStatus } from "#/lib/api/types";
import { useRequireAuth } from "#/lib/application/auth/useRequireAuth";
import { useGameEvents } from "#/lib/application/realtime/useGameEvents";
import {
	useCurrentRound,
	useRoundHistory,
} from "#/lib/application/rounds/queries";
import { useMyWallet } from "#/lib/application/wallet/queries";

export const Route = createFileRoute("/play")({ component: PlayPage });

// After this many ms since a crash, treat the round as "between rounds" and
// suppress the CRASHED overlay + roll the phase back to IDLE. Backend still
// returns the just-crashed round as `current` between rounds (see backend CR),
// so without this users opening the page see a stale crash flash.
const STALE_CRASH_MS = 3500;

function PlayPage() {
	const { isAuthenticated, isLoading } = useRequireAuth("/login");
	useGameEvents();
	const round = useCurrentRound();
	const history = useRoundHistory({ page: 1, pageSize: 20 });
	const wallet = useMyWallet();

	if (isLoading || !isAuthenticated) {
		return (
			<AppShell>
				<div className="flex flex-1 items-center justify-center text-fg-muted">
					Loading…
				</div>
			</AppShell>
		);
	}

	const data = round.data ?? null;
	const rawPhase: RoundStatus | "IDLE" = data?.status ?? "IDLE";
	const crashedAtMs = data?.crashedAt ? Date.parse(data.crashedAt) : null;
	const isStaleCrash =
		rawPhase === RoundStatus.CRASHED &&
		crashedAtMs != null &&
		Date.now() - crashedAtMs > STALE_CRASH_MS;
	const phase: RoundStatus | "IDLE" = isStaleCrash ? "IDLE" : rawPhase;

	const flyingStartedAt = data?.flyingStartedAt
		? Date.parse(data.flyingStartedAt)
		: null;
	// Skew correction: assume the client clock ≈ server clock. Real clock-skew
	// negotiation would need a server-now anchor; until backend adds that, treat
	// timestamps from the API as directly comparable to Date.now().
	const clockOffsetMs = 0;
	const balanceCents = wallet.data ? BigInt(wallet.data.balance) : null;

	return (
		<AppShell header={<PlayerHeader />}>
			<div className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col gap-4 px-4 pb-72 pt-4 lg:flex-row lg:gap-6 lg:px-6 lg:pb-6">
				<div className="flex min-w-0 flex-1 flex-col gap-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<HashCommit hash={data?.hashCommitment} nonce={data?.nonce} />
						<PhaseTimer
							phase={phase}
							bettingEndsAt={data?.bettingEndsAt ?? null}
							clockOffsetMs={clockOffsetMs}
						/>
					</div>

					<motion.div
						className="aspect-16/10 w-full md:aspect-2/1"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ type: "spring", stiffness: 220, damping: 22 }}>
						<CrashChart
							phase={phase}
							startTimeMs={flyingStartedAt}
							growthRate={data?.growthRate ?? null}
							clockOffsetMs={clockOffsetMs}
							frozenAtHundredths={
								phase === RoundStatus.CRASHED
									? (data?.crashPointHundredths ?? null)
									: null
							}
							roundId={data?.id}
						/>
					</motion.div>

					<HistoryStrip rounds={history.data?.items ?? []} />

					<div className="grid gap-4 lg:hidden">
						<RoundBets bets={data?.bets ?? []} />
					</div>
				</div>

				<aside className="hidden w-full flex-col gap-4 lg:flex lg:w-80">
					<BetPanel
						round={isStaleCrash ? null : data}
						clockOffsetMs={clockOffsetMs}
						balanceCents={balanceCents}
					/>
					<RoundBets bets={data?.bets ?? []} />
					<LeaderboardMini />
				</aside>
			</div>

			<div className="fixed inset-x-0 bottom-0 z-10 border-t border-border/70 bg-bg-0/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 backdrop-blur-md lg:hidden">
				<BetPanel
					round={isStaleCrash ? null : data}
					clockOffsetMs={clockOffsetMs}
					balanceCents={balanceCents}
					headerExtra={
						<Drawer
							side="right"
							title="Top 24h"
							description="Live leaderboard"
							trigger={
								<button
									type="button"
									aria-label="Open leaderboard"
									className="inline-flex items-center gap-1.5 rounded-pill bg-bg-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-fg-muted ring-1 ring-inset ring-border/60 hover:text-primary hover:ring-primary/40">
									<TrophyIcon
										size={12}
										weight="duotone"
										className="text-primary"
									/>
									Top
								</button>
							}>
							<LeaderboardMini />
						</Drawer>
					}
				/>
			</div>
		</AppShell>
	);
}

function HashCommit({ hash, nonce }: { hash?: string; nonce?: number }) {
	if (!hash) return <span />;
	return (
		<div className="flex items-center gap-2 rounded-pill bg-bg-1 px-3 py-1.5 font-mono text-[10px] text-fg-dim ring-1 ring-inset ring-border">
			<ShieldCheckIcon size={12} weight="duotone" className="text-primary" />
			<span className="font-bold uppercase tracking-[0.25em]">
				#{nonce ?? "—"}
			</span>
			<code className="truncate text-fg-muted">{hash.slice(0, 14)}…</code>
		</div>
	);
}
