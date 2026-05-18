import {
	ArrowLeftIcon,
	ArrowRightIcon,
	ArrowSquareOutIcon,
	ClockClockwiseIcon,
} from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { PlayerHeader } from "#/components/game/PlayerHeader";
import { AppShell } from "#/components/shared/AppShell";
import { Button } from "#/components/ui";
import { useRoundHistory } from "#/lib/application/rounds/queries";
import { formatMultiplier } from "#/lib/domain/money";
import { TONE_TEXT, toneForHundredths } from "#/lib/domain/multiplier-tone";

export const Route = createFileRoute("/history")({ component: HistoryPage });

function HistoryPage() {
	const [page, setPage] = useState(1);
	const query = useRoundHistory({ page, pageSize: 25 });
	const items = query.data?.items ?? [];

	return (
		<AppShell header={<PlayerHeader />}>
			<section className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-6 lg:py-10">
				<header className="mb-6 flex items-end justify-between gap-3">
					<div>
						<span className="inline-flex items-center gap-2 rounded-(--radius-pill) bg-(--color-bg-1) px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-(--color-fg-muted) ring-1 ring-inset ring-(--color-border)">
							<ClockClockwiseIcon size={12} weight="bold" />
							Public ledger
						</span>
						<h1 className="mt-3 text-3xl font-black tracking-tighter text-(--color-fg) lg:text-4xl">
							Round history
						</h1>
					</div>
					<span className="font-mono text-xs text-(--color-fg-dim)">
						page {page}
					</span>
				</header>

				{query.isPending && <HistorySkeleton />}

				{!query.isPending && items.length === 0 && (
					<div className="rounded-(--radius-card) bg-(--color-bg-1) p-12 text-center text-sm text-(--color-fg-muted) ring-1 ring-inset ring-(--color-border)/60">
						No rounds on this page yet.
					</div>
				)}

				{items.length > 0 && (
					<>
						<div className="hidden overflow-hidden rounded-(--radius-card) bg-(--color-bg-1) ring-1 ring-inset ring-(--color-border)/60 shadow-(--shadow-card) md:block">
							<table className="w-full text-sm">
								<thead className="text-[10px] font-bold uppercase tracking-[0.25em] text-(--color-fg-dim)">
									<tr className="border-b border-(--color-border)/60">
										<th className="px-5 py-3 text-left">Round</th>
										<th className="px-5 py-3 text-left">Crash</th>
										<th className="px-5 py-3 text-left">Crashed at</th>
										<th className="px-5 py-3 text-right">Verify</th>
									</tr>
								</thead>
								<tbody>
									{items.map((r, i) => (
										<motion.tr
											key={r.id}
											initial={{ opacity: 0, y: 4 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: Math.min(i * 0.015, 0.25) }}
											className="border-b border-(--color-border)/40 transition-colors last:border-0 hover:bg-(--color-bg-2)/50"
										>
											<td className="px-5 py-3 font-mono text-xs text-(--color-fg-muted)">
												{r.id.slice(0, 12)}
											</td>
											<td
												className={`px-5 py-3 font-mono text-base font-black tabular-nums ${TONE_TEXT[toneForHundredths(r.crashPointHundredths ?? 0)]}`}
											>
												{formatMultiplier(r.crashPointHundredths)}
											</td>
											<td className="px-5 py-3 font-mono text-xs text-(--color-fg-muted)">
												{r.crashedAt
													? new Date(r.crashedAt).toLocaleTimeString()
													: "—"}
											</td>
											<td className="px-5 py-3 text-right">
												<Link
													to="/verify/$roundId"
													params={{ roundId: r.id }}
													className="inline-flex items-center gap-1 text-xs font-bold text-(--color-primary) hover:underline"
												>
													verify
													<ArrowSquareOutIcon size={12} weight="bold" />
												</Link>
											</td>
										</motion.tr>
									))}
								</tbody>
							</table>
						</div>

						<ul className="flex flex-col gap-2 md:hidden">
							{items.map((r) => (
								<li
									key={r.id}
									className="flex items-center justify-between rounded-(--radius-card) bg-(--color-bg-1) p-4 ring-1 ring-inset ring-(--color-border)/60"
								>
									<div className="flex flex-col gap-1">
										<span className="font-mono text-[10px] text-(--color-fg-dim)">
											{r.id.slice(0, 10)}
										</span>
										<span
											className={`font-mono text-2xl font-black tabular-nums ${TONE_TEXT[toneForHundredths(r.crashPointHundredths ?? 0)]}`}
										>
											{formatMultiplier(r.crashPointHundredths)}
										</span>
										<span className="font-mono text-[10px] text-(--color-fg-muted)">
											{r.crashedAt
												? new Date(r.crashedAt).toLocaleTimeString()
												: "—"}
										</span>
									</div>
									<Link
										to="/verify/$roundId"
										params={{ roundId: r.id }}
										className="inline-flex items-center gap-1 rounded-(--radius-pill) bg-(--color-bg-2) px-3 py-1.5 text-[11px] font-bold text-(--color-primary)"
									>
										verify
										<ArrowSquareOutIcon size={11} weight="bold" />
									</Link>
								</li>
							))}
						</ul>
					</>
				)}

				<div className="mt-6 flex justify-end gap-2">
					<Button
						variant="secondary"
						size="sm"
						onClick={() => setPage((p) => Math.max(1, p - 1))}
						disabled={page === 1}
					>
						<ArrowLeftIcon size={12} weight="bold" />
						Prev
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => setPage((p) => p + 1)}
						disabled={!query.data || query.data.items.length < 25}
					>
						Next
						<ArrowRightIcon size={12} weight="bold" />
					</Button>
				</div>
			</section>
		</AppShell>
	);
}

function HistorySkeleton() {
	return (
		<div className="flex flex-col gap-2">
			{Array.from({ length: 6 }, (_, i) => `skel-${i}`).map((id) => (
				<div
					key={id}
					className="h-12 animate-pulse rounded-(--radius-control) bg-(--color-bg-1)/60"
				/>
			))}
		</div>
	);
}
