import {
	ArrowLeftIcon,
	ArrowRightIcon,
	ReceiptIcon,
	TrendDownIcon,
	TrendUpIcon,
	WalletIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PlayerHeader } from "#/components/game/PlayerHeader";
import { AppShell } from "#/components/shared/AppShell";
import { Button } from "#/components/ui";
import type { BetDto } from "#/lib/api/types";
import { BetStatus } from "#/lib/api/types";
import { useRequireAuth } from "#/lib/application/auth/useRequireAuth";
import { useMyBets } from "#/lib/application/bets/queries";
import { useMyWallet } from "#/lib/application/wallet/queries";
import { formatCents, formatMultiplier } from "#/lib/domain/money";
import { Cents } from "#/lib/domain/types";

export const Route = createFileRoute("/me")({ component: MePage });

function MePage() {
	const { isAuthenticated, isLoading } = useRequireAuth("/login");
	const [page, setPage] = useState(1);
	const wallet = useMyWallet();
	const bets = useMyBets({ page, pageSize: 20 });

	const stats = useMemo(() => statsFor(bets.data?.items ?? []), [bets.data]);

	if (isLoading || !isAuthenticated) {
		return (
			<AppShell>
				<div className="flex flex-1 items-center justify-center text-(--color-fg-muted)">
					Loading…
				</div>
			</AppShell>
		);
	}

	const balance = wallet.data ? Cents(BigInt(wallet.data.balance)) : null;
	const items = bets.data?.items ?? [];

	return (
		<AppShell header={<PlayerHeader />}>
			<section className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-6 lg:py-10">
				<header className="mb-6">
					<span className="inline-flex items-center gap-2 rounded-(--radius-pill) bg-(--color-bg-1) px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-(--color-fg-muted) ring-1 ring-inset ring-(--color-border)">
						<ReceiptIcon size={12} weight="bold" />
						My ledger
					</span>
					<h1 className="mt-3 text-3xl font-black tracking-tighter text-(--color-fg) lg:text-4xl">
						My bets
					</h1>
				</header>

				<div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
					<StatCard
						icon={
							<WalletIcon
								size={18}
								weight="duotone"
								className="text-(--color-secondary)"
							/>
						}
						label="Balance"
						value={`${formatCents(balance)} BRL`}
						tone="text-(--color-secondary)"
					/>
					<StatCard
						icon={
							<TrendUpIcon
								size={18}
								weight="bold"
								className="text-(--color-secondary)"
							/>
						}
						label={`Profit (last ${items.length})`}
						value={formatSignedCents(stats.profitCents)}
						tone={
							stats.profitCents >= 0n
								? "text-(--color-secondary)"
								: "text-(--color-danger)"
						}
					/>
					<StatCard
						icon={
							<TrendDownIcon
								size={18}
								weight="bold"
								className="text-(--color-primary)"
							/>
						}
						label="Win rate"
						value={`${stats.winRate.toFixed(0)}%`}
						tone="text-(--color-primary)"
					/>
				</div>

				<div className="hidden overflow-hidden rounded-(--radius-card) bg-(--color-bg-1) ring-1 ring-inset ring-(--color-border)/60 shadow-(--shadow-card) md:block">
					<table className="w-full text-sm">
						<thead className="text-[10px] font-bold uppercase tracking-[0.25em] text-(--color-fg-dim)">
							<tr className="border-b border-(--color-border)/60">
								<th className="px-5 py-3 text-left">When</th>
								<th className="px-5 py-3 text-left">Stake</th>
								<th className="px-5 py-3 text-left">Status</th>
								<th className="px-5 py-3 text-right">Payout</th>
							</tr>
						</thead>
						<tbody>
							{items.map((b) => (
								<tr
									key={b.id}
									className="border-b border-(--color-border)/40 transition-colors last:border-0 hover:bg-(--color-bg-2)/40"
								>
									<td className="px-5 py-3 font-mono text-xs text-(--color-fg-muted)">
										{new Date(b.createdAt).toLocaleString()}
									</td>
									<td className="px-5 py-3 font-mono text-(--color-fg)">
										{formatCents(Cents(BigInt(b.amountCents)))}
									</td>
									<td className="px-5 py-3">
										<StatusBadge status={b.status} />
									</td>
									<td className="px-5 py-3 text-right font-mono">
										{b.status === BetStatus.WON && b.payoutCents != null ? (
											<span className="text-(--color-secondary)">
												{formatCents(Cents(BigInt(b.payoutCents)))}{" "}
												<span className="text-(--color-fg-dim)">
													@ {formatMultiplier(b.cashoutMultiplierHundredths)}
												</span>
											</span>
										) : b.status === BetStatus.LOST ? (
											<span className="text-(--color-fg-dim)">—</span>
										) : (
											<span className="text-(--color-fg-muted)">pending</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<ul className="flex flex-col gap-2 md:hidden">
					{items.map((b) => (
						<li
							key={b.id}
							className="flex flex-col gap-2 rounded-(--radius-card) bg-(--color-bg-1) p-4 ring-1 ring-inset ring-(--color-border)/60"
						>
							<div className="flex items-center justify-between">
								<span className="font-mono text-[10px] text-(--color-fg-dim)">
									{new Date(b.createdAt).toLocaleString()}
								</span>
								<StatusBadge status={b.status} />
							</div>
							<div className="flex items-baseline justify-between">
								<span className="font-mono text-sm text-(--color-fg)">
									{formatCents(Cents(BigInt(b.amountCents)))}
								</span>
								{b.status === BetStatus.WON && b.payoutCents != null ? (
									<span className="font-mono text-sm font-bold text-(--color-secondary)">
										+{formatCents(Cents(BigInt(b.payoutCents)))}
									</span>
								) : b.status === BetStatus.LOST ? (
									<span className="font-mono text-sm text-(--color-danger)">
										−{formatCents(Cents(BigInt(b.amountCents)))}
									</span>
								) : (
									<span className="font-mono text-sm text-(--color-fg-muted)">
										pending
									</span>
								)}
							</div>
						</li>
					))}
				</ul>

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
						disabled={!bets.data || bets.data.items.length < 20}
					>
						Next
						<ArrowRightIcon size={12} weight="bold" />
					</Button>
				</div>
			</section>
		</AppShell>
	);
}

function StatCard({
	icon,
	label,
	value,
	tone,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	tone: string;
}) {
	return (
		<div className="flex items-center gap-4 rounded-(--radius-card) bg-(--color-bg-1) p-5 ring-1 ring-inset ring-(--color-border)/60 shadow-(--shadow-card)">
			<div className="flex size-10 items-center justify-center rounded-(--radius-control) bg-(--color-bg-2)">
				{icon}
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-[10px] font-bold uppercase tracking-[0.3em] text-(--color-fg-dim)">
					{label}
				</p>
				<p className={`font-mono text-xl font-black tabular-nums ${tone}`}>
					{value}
				</p>
			</div>
		</div>
	);
}

function StatusBadge({ status }: { status: BetStatus }) {
	const map: Record<BetStatus, string> = {
		[BetStatus.WON]: "bg-(--color-secondary)/15 text-(--color-secondary)",
		[BetStatus.LOST]: "bg-(--color-danger)/15 text-(--color-danger)",
		[BetStatus.CONFIRMED]: "bg-(--color-primary)/15 text-(--color-primary)",
		[BetStatus.PENDING]: "bg-(--color-bg-2) text-(--color-fg-muted)",
		[BetStatus.CANCELLED]: "bg-(--color-bg-2) text-(--color-fg-dim)",
	};
	return (
		<span
			className={`inline-flex rounded-(--radius-pill) px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.25em] ${map[status] ?? map[BetStatus.PENDING]}`}
		>
			{status.toLowerCase()}
		</span>
	);
}

function statsFor(bets: BetDto[]): { profitCents: bigint; winRate: number } {
	if (bets.length === 0) return { profitCents: 0n, winRate: 0 };
	let profit = 0n;
	let settled = 0;
	let won = 0;
	for (const b of bets) {
		if (b.status === BetStatus.WON && b.payoutCents != null) {
			profit += BigInt(b.payoutCents) - BigInt(b.amountCents);
			settled++;
			won++;
		} else if (b.status === BetStatus.LOST) {
			profit -= BigInt(b.amountCents);
			settled++;
		}
	}
	return {
		profitCents: profit,
		winRate: settled === 0 ? 0 : (won * 100) / settled,
	};
}

function formatSignedCents(cents: bigint): string {
	const sign = cents < 0n ? "−" : cents > 0n ? "+" : "";
	const abs = cents < 0n ? -cents : cents;
	return `${sign}${formatCents(Cents(abs))}`;
}
