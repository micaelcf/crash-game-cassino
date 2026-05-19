import {
	ReceiptIcon,
	TrendDownIcon,
	TrendUpIcon,
	WalletIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { PlayerHeader } from "#/components/game/PlayerHeader";
import { AppShell } from "#/components/shared/AppShell";
import { DataTable } from "#/components/ui";
import type { BetDto } from "#/lib/api/types";
import { BetStatus } from "#/lib/api/types";
import { useRequireAuth } from "#/lib/application/auth/useRequireAuth";
import { useMyBets } from "#/lib/application/bets/queries";
import { useMyWallet } from "#/lib/application/wallet/queries";
import { formatCents, formatMultiplier } from "#/lib/domain/money";
import { Cents } from "#/lib/domain/types";

export const Route = createFileRoute("/me")({ component: MePage });

const PAGE_SIZE = 20;
const columnHelper = createColumnHelper<BetDto>();

function MePage() {
	const { isAuthenticated, isLoading } = useRequireAuth("/login");
	const [page, setPage] = useState(1);
	const wallet = useMyWallet();
	const bets = useMyBets({ page, pageSize: PAGE_SIZE });

	const stats = useMemo(() => statsFor(bets.data?.items ?? []), [bets.data]);

	const columns = useMemo(
		() => [
			columnHelper.accessor("createdAt", {
				header: "When",
				cell: (info) => (
					<span className="font-mono text-xs text-fg-muted">
						{new Date(info.getValue()).toLocaleString()}
					</span>
				),
			}),
			columnHelper.accessor("amountCents", {
				header: "Stake",
				cell: (info) => (
					<span className="font-mono text-fg">
						{formatCents(Cents(BigInt(info.getValue())))}
					</span>
				),
			}),
			columnHelper.accessor("status", {
				header: "Status",
				cell: (info) => <StatusBadge status={info.getValue()} />,
			}),
			columnHelper.display({
				id: "payout",
				header: "Payout",
				meta: { align: "right" },
				cell: ({ row }) => <PayoutCell bet={row.original} />,
			}),
		],
		[],
	);

	if (isLoading || !isAuthenticated) {
		return (
			<AppShell>
				<div className="flex flex-1 items-center justify-center text-fg-muted">
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
					<span className="inline-flex items-center gap-2 rounded-pill bg-bg-1 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-fg-muted ring-1 ring-inset ring-border">
						<ReceiptIcon size={12} weight="bold" />
						My ledger
					</span>
					<h1 className="mt-3 text-3xl font-black tracking-tighter text-fg lg:text-4xl">
						My bets
					</h1>
				</header>

				<div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
					<StatCard
						icon={
							<WalletIcon
								size={18}
								weight="duotone"
								className="text-secondary"
							/>
						}
						label="Balance"
						value={`${formatCents(balance)} BRL`}
						tone="text-secondary"
					/>
					<StatCard
						icon={
							<TrendUpIcon size={18} weight="bold" className="text-secondary" />
						}
						label={`Profit (last ${items.length})`}
						value={formatSignedCents(stats.profitCents)}
						tone={stats.profitCents >= 0n ? "text-secondary" : "text-danger"}
					/>
					<StatCard
						icon={
							<TrendDownIcon size={18} weight="bold" className="text-primary" />
						}
						label="Win rate"
						value={`${stats.winRate.toFixed(0)}%`}
						tone="text-primary"
					/>
				</div>

				<DataTable
					columns={columns}
					data={items}
					isLoading={bets.isPending}
					emptyMessage="No bets yet."
					getRowId={(b) => b.id}
					pagination={{
						page,
						pageSize: PAGE_SIZE,
						onPageChange: setPage,
						totalItems: bets.data?.total,
					}}
					mobileCard={(b) => (
						<div className="flex flex-col gap-2 rounded-(--radius-card) bg-bg-1 p-4 ring-1 ring-inset ring-border/60">
							<div className="flex items-center justify-between">
								<span className="font-mono text-[10px] text-fg-dim">
									{new Date(b.createdAt).toLocaleString()}
								</span>
								<StatusBadge status={b.status} />
							</div>
							<div className="flex items-baseline justify-between">
								<span className="font-mono text-sm text-fg">
									{formatCents(Cents(BigInt(b.amountCents)))}
								</span>
								<MobilePayoutCell bet={b} />
							</div>
						</div>
					)}
				/>
			</section>
		</AppShell>
	);
}

function PayoutCell({ bet }: { bet: BetDto }) {
	if (bet.status === BetStatus.WON && bet.payoutCents != null) {
		return (
			<span className="font-mono text-secondary">
				{formatCents(Cents(BigInt(bet.payoutCents)))}{" "}
				<span className="text-fg-dim">
					@ {formatMultiplier(bet.cashoutMultiplierHundredths)}
				</span>
			</span>
		);
	}
	if (bet.status === BetStatus.LOST) {
		return <span className="font-mono text-fg-dim">—</span>;
	}
	return <span className="font-mono text-fg-muted">pending</span>;
}

function MobilePayoutCell({ bet }: { bet: BetDto }) {
	if (bet.status === BetStatus.WON && bet.payoutCents != null) {
		return (
			<span className="font-mono text-sm font-bold text-secondary">
				+{formatCents(Cents(BigInt(bet.payoutCents)))}
			</span>
		);
	}
	if (bet.status === BetStatus.LOST) {
		return (
			<span className="font-mono text-sm text-danger">
				−{formatCents(Cents(BigInt(bet.amountCents)))}
			</span>
		);
	}
	return <span className="font-mono text-sm text-fg-muted">pending</span>;
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
		<div className="flex items-center gap-4 rounded-(--radius-card) bg-bg-1 p-5 ring-1 ring-inset ring-border/60 shadow-(--shadow-card)">
			<div className="flex size-10 items-center justify-center rounded-control bg-bg-2">
				{icon}
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-[10px] font-bold uppercase tracking-[0.3em] text-fg-dim">
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
		[BetStatus.WON]: "bg-secondary/15 text-secondary",
		[BetStatus.LOST]: "bg-danger/15 text-danger",
		[BetStatus.CONFIRMED]: "bg-primary/15 text-primary",
		[BetStatus.PENDING]: "bg-bg-2 text-fg-muted",
		[BetStatus.CANCELLED]: "bg-bg-2 text-fg-dim",
	};
	return (
		<span
			className={`inline-flex rounded-pill px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.25em] ${map[status] ?? map[BetStatus.PENDING]}`}>
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
