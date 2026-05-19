import { ArrowSquareOutIcon, ClockClockwiseIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { PlayerHeader } from "#/components/game/PlayerHeader";
import { AppShell } from "#/components/shared/AppShell";
import { DataTable } from "#/components/ui";
import type { RoundDto } from "#/lib/api/types";
import { useRoundHistory } from "#/lib/application/rounds/queries";
import { formatMultiplier } from "#/lib/domain/money";
import { TONE_TEXT, toneForHundredths } from "#/lib/domain/multiplier-tone";

export const Route = createFileRoute("/history")({ component: HistoryPage });

const PAGE_SIZE = 25;
const columnHelper = createColumnHelper<RoundDto>();

function HistoryPage() {
	const [page, setPage] = useState(1);
	const query = useRoundHistory({ page, pageSize: PAGE_SIZE });
	const items = query.data?.items ?? [];

	const columns = useMemo(
		() => [
			columnHelper.accessor("id", {
				header: "Round",
				cell: (info) => (
					<span className="font-mono text-xs text-fg-muted">
						{info.getValue().slice(0, 12)}
					</span>
				),
			}),
			columnHelper.accessor("crashPointHundredths", {
				header: "Crash",
				cell: (info) => {
					const h = info.getValue() ?? 0;
					return (
						<span
							className={`font-mono text-base font-black tabular-nums ${TONE_TEXT[toneForHundredths(h)]}`}>
							{formatMultiplier(h)}
						</span>
					);
				},
			}),
			columnHelper.accessor("crashedAt", {
				header: "Crashed at",
				cell: (info) => (
					<span className="font-mono text-xs text-fg-muted">
						{info.getValue()
							? new Date(info.getValue() as string).toLocaleTimeString()
							: "—"}
					</span>
				),
			}),
			columnHelper.display({
				id: "verify",
				header: "Verify",
				meta: { align: "right" },
				cell: ({ row }) => (
					<Link
						to="/verify/$roundId"
						params={{ roundId: row.original.id }}
						className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
						verify
						<ArrowSquareOutIcon size={12} weight="bold" />
					</Link>
				),
			}),
		],
		[],
	);

	return (
		<AppShell header={<PlayerHeader />}>
			<section className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-6 lg:py-10">
				<header className="mb-6">
					<span className="inline-flex items-center gap-2 rounded-pill bg-bg-1 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-fg-muted ring-1 ring-inset ring-border">
						<ClockClockwiseIcon size={12} weight="bold" />
						Public ledger
					</span>
					<h1 className="mt-3 text-3xl font-black tracking-tighter text-fg lg:text-4xl">
						Round history
					</h1>
				</header>

				<DataTable
					columns={columns}
					data={items}
					isLoading={query.isPending}
					emptyMessage="No rounds on this page yet."
					getRowId={(r) => r.id}
					pagination={{
						page,
						pageSize: PAGE_SIZE,
						onPageChange: setPage,
						totalItems: query.data?.total,
					}}
					mobileCard={(r) => (
						<div className="flex items-center justify-between rounded-(--radius-card) bg-bg-1 p-4 ring-1 ring-inset ring-border/60">
							<div className="flex flex-col gap-1">
								<span className="font-mono text-[10px] text-fg-dim">
									{r.id.slice(0, 10)}
								</span>
								<span
									className={`font-mono text-2xl font-black tabular-nums ${TONE_TEXT[toneForHundredths(r.crashPointHundredths ?? 0)]}`}>
									{formatMultiplier(r.crashPointHundredths)}
								</span>
								<span className="font-mono text-[10px] text-fg-muted">
									{r.crashedAt
										? new Date(r.crashedAt).toLocaleTimeString()
										: "—"}
								</span>
							</div>
							<Link
								to="/verify/$roundId"
								params={{ roundId: r.id }}
								className="inline-flex items-center gap-1 rounded-pill bg-bg-2 px-3 py-1.5 text-[11px] font-bold text-primary">
								verify
								<ArrowSquareOutIcon size={11} weight="bold" />
							</Link>
						</div>
					)}
				/>
			</section>
		</AppShell>
	);
}
