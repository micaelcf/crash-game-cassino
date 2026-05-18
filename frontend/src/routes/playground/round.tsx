import { createFileRoute } from "@tanstack/react-router";
import type { ApiError } from "#/api/http";
import { EventLog } from "#/components/playground/EventLog";
import { JsonView } from "#/components/playground/JsonView";
import { PhaseBadge } from "#/components/playground/PhaseBadge";
import { Section } from "#/components/playground/Section";
import { useCurrentRound } from "#/queries/rounds";

export const Route = createFileRoute("/playground/round")({
	component: RoundSection,
});

function RoundSection() {
	const round = useCurrentRound();
	const err = round.error as ApiError | undefined;

	return (
		<div className="space-y-4">
			<Section
				title="GET /games/rounds/current"
				actions={
					<button
						type="button"
						onClick={() => round.refetch()}
						className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
					>
						Refetch
					</button>
				}
			>
				{err ? (
					<p className="text-rose-400 text-xs">
						HTTP {err.status}: {err.message}
					</p>
				) : null}
				<div className="flex items-center gap-2">
					<PhaseBadge phase={round.data?.status} />
					<span className="font-mono text-xs text-slate-400">
						round: {round.data?.id ?? "—"}
					</span>
				</div>
				<JsonView value={round.data ?? null} />
			</Section>

			<Section
				title="WebSocket event log"
				description={`Socket.IO via Kong at ${import.meta.env.VITE_WS_URL ?? "?"}/socket.io/ — events: round.betting / round.started / round.crashed / bet.placed / bet.cashed_out.`}
			>
				<EventLog />
			</Section>
		</div>
	);
}
