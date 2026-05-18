import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { JsonView } from "#/components/playground/JsonView";
import { Section } from "#/components/playground/Section";
import { useMyBets } from "#/lib/application/bets/queries";
import { useRoundHistory } from "#/lib/application/rounds/queries";

export const Route = createFileRoute("/playground/history")({
	component: HistorySection,
});

function HistorySection() {
	const [roundsPage, setRoundsPage] = useState(1);
	const [betsPage, setBetsPage] = useState(1);
	const rounds = useRoundHistory({ page: roundsPage, pageSize: 10 });
	const bets = useMyBets({ page: betsPage, pageSize: 10 });

	return (
		<div className="space-y-4">
			<Section
				title="GET /games/rounds/history"
				actions={
					<Pager
						page={roundsPage}
						total={rounds.data?.total}
						pageSize={rounds.data?.pageSize ?? 10}
						onChange={setRoundsPage}
					/>
				}
			>
				<JsonView value={rounds.data ?? null} />
			</Section>

			<Section
				title="GET /games/bets/me"
				actions={
					<Pager
						page={betsPage}
						total={bets.data?.total}
						pageSize={bets.data?.pageSize ?? 10}
						onChange={setBetsPage}
					/>
				}
			>
				<JsonView value={bets.data ?? null} />
			</Section>
		</div>
	);
}

function Pager({
	page,
	total,
	pageSize,
	onChange,
}: {
	page: number;
	total: number | undefined;
	pageSize: number;
	onChange: (p: number) => void;
}) {
	const maxPage = total ? Math.max(1, Math.ceil(total / pageSize)) : 1;
	return (
		<div className="flex items-center gap-1 text-xs">
			<button
				type="button"
				onClick={() => onChange(Math.max(1, page - 1))}
				disabled={page <= 1}
				className="rounded border border-slate-700 px-2 py-1 disabled:opacity-50"
			>
				Prev
			</button>
			<span className="px-2 text-slate-400">
				{page} / {maxPage}
			</span>
			<button
				type="button"
				onClick={() => onChange(Math.min(maxPage, page + 1))}
				disabled={page >= maxPage}
				className="rounded border border-slate-700 px-2 py-1 disabled:opacity-50"
			>
				Next
			</button>
		</div>
	);
}
