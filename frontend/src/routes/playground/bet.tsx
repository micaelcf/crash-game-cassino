import { useLogto } from "@logto/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useRequireAuth } from "#/auth/useRequireAuth";
import { BetForm } from "#/components/playground/BetForm";
import { CashOutButton } from "#/components/playground/CashOutButton";
import { JsonView } from "#/components/playground/JsonView";
import { MultiplierDisplay } from "#/components/playground/MultiplierDisplay";
import { PhaseBadge } from "#/components/playground/PhaseBadge";
import { Section } from "#/components/playground/Section";
import { computeClockOffset } from "#/game/clock";
import { formatCents } from "#/game/money";
import { useCurrentRound } from "#/queries/rounds";

export const Route = createFileRoute("/playground/bet")({
	component: BetSection,
});

function BetSection() {
	useRequireAuth("/login");
	const { data: round } = useCurrentRound();
	const { getIdTokenClaims } = useLogto();
	const [sub, setSub] = useState<string | undefined>();

	useEffect(() => {
		void getIdTokenClaims().then((c) => setSub(c?.sub));
	}, [getIdTokenClaims]);

	const myBet = round?.bets.find((b) => b.userId === sub);
	const phase = round?.status;
	const flying = phase === "FLYING";
	const crashed = phase === "CRASHED";
	const startMs = round?.flyingStartedAt
		? Date.parse(round.flyingStartedAt)
		: null;
	const clockOffsetMs = round?.flyingStartedAt
		? computeClockOffset(round.flyingStartedAt)
		: 0;

	const canBet = phase === "BETTING_PHASE" && !myBet;
	const canCashOut = flying && myBet?.status === "CONFIRMED";

	return (
		<div className="space-y-4">
			<Section title="Live multiplier" actions={<PhaseBadge phase={phase} />}>
				<div className="flex items-end gap-4">
					<MultiplierDisplay
						startTimeMs={startMs}
						growthRate={round?.growthRate ?? null}
						clockOffsetMs={clockOffsetMs}
						running={flying}
						frozenAtHundredths={crashed ? round?.crashPointHundredths : null}
					/>
					<div className="pb-1 text-xs text-slate-400">
						{flying
							? "rAF projection from startTime + growthRate (no React state)"
							: crashed
								? "frozen at crash point"
								: "idle"}
					</div>
				</div>
			</Section>

			<Section
				title="Place bet"
				description="POST /games/bet — server uses string-cents."
			>
				<BetForm disabled={!canBet} />
				{myBet ? (
					<p className="text-slate-400 text-xs">
						Existing bet for this round (status: {myBet.status}) — cannot place
						another.
					</p>
				) : null}
			</Section>

			<Section
				title="Cash out"
				description="POST /games/bet/cashout — server picks the multiplier at the moment it lands."
			>
				<CashOutButton disabled={!canCashOut} />
			</Section>

			<Section title="My bet on this round">
				{myBet ? (
					<>
						<p className="text-sm">
							Status: <strong>{myBet.status}</strong> · Amount:{" "}
							{formatCents(myBet.amountCents)} cents · Payout:{" "}
							{myBet.payoutCents ? formatCents(myBet.payoutCents) : "—"} ·
							Multi:{" "}
							{myBet.cashoutMultiplierHundredths != null
								? `${(myBet.cashoutMultiplierHundredths / 100).toFixed(2)}x`
								: "—"}
						</p>
						<JsonView value={myBet} />
					</>
				) : (
					<p className="text-slate-400 text-xs">No bet placed yet.</p>
				)}
			</Section>

			<Section title="All bets on this round">
				<JsonView value={round?.bets ?? []} />
			</Section>
		</div>
	);
}
