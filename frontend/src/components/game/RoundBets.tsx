import { TrophyIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { ScrollArea } from "#/components/ui";
import type { BetDto } from "#/lib/api/types";
import { BetStatus } from "#/lib/api/types";
import { formatCents, formatMultiplier } from "#/lib/domain/money";
import { Cents } from "#/lib/domain/types";

export interface RoundBetsProps {
	bets: BetDto[];
}

export function RoundBets({ bets }: RoundBetsProps) {
	const sorted = useMemo(
		() =>
			[...bets].sort((a, b) => {
				if (a.status === BetStatus.WON && b.status !== BetStatus.WON) return -1;
				if (b.status === BetStatus.WON && a.status !== BetStatus.WON) return 1;
				return Number(BigInt(b.amountCents) - BigInt(a.amountCents));
			}),
		[bets],
	);

	return (
		<section className="flex flex-col gap-2 rounded-(--radius-card) bg-bg-1 p-4 ring-1 ring-inset ring-border/70 shadow-(--shadow-card)">
			<header className="flex items-baseline justify-between">
				<h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-fg-muted">
					<UsersThreeIcon size={14} weight="duotone" className="text-primary" />
					Round bets
				</h2>
				<span className="font-mono text-[11px] tabular-nums text-fg-dim">
					{sorted.length} player{sorted.length === 1 ? "" : "s"}
				</span>
			</header>

			{sorted.length === 0 && (
				<p className="py-8 text-center text-xs text-fg-dim">
					Be the first to place a bet.
				</p>
			)}

			<ScrollArea className="max-h-72" orientation="vertical">
				<ul className="flex flex-col gap-1 pr-2">
					<AnimatePresence initial={false}>
						{sorted.map((bet) => (
							<motion.li
								key={bet.id}
								layout
								initial={{ opacity: 0, x: -8 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 8 }}
								transition={{ type: "spring", stiffness: 260, damping: 22 }}
								className={rowClass(bet.status)}>
								<span className="flex min-w-0 items-center gap-1.5">
									{bet.status === BetStatus.WON && (
										<TrophyIcon
											size={12}
											weight="fill"
											className="shrink-0 text-secondary"
										/>
									)}
									<span className="truncate text-xs font-semibold text-fg">
										{bet.username ?? bet.userId.slice(0, 8)}
									</span>
								</span>
								<span className="flex items-center gap-2 font-mono text-xs tabular-nums">
									<span className="text-fg-muted">
										{formatCents(Cents(BigInt(bet.amountCents)))}
									</span>
									{bet.status === BetStatus.WON && bet.payoutCents != null && (
										<span className="text-secondary">
											→ {formatCents(Cents(BigInt(bet.payoutCents)))}{" "}
											<span className="text-fg-dim">
												@ {formatMultiplier(bet.cashoutMultiplierHundredths)}
											</span>
										</span>
									)}
								</span>
							</motion.li>
						))}
					</AnimatePresence>
				</ul>
			</ScrollArea>
		</section>
	);
}

function rowClass(status: BetStatus): string {
	const base =
		"flex items-center justify-between rounded-control px-2.5 py-1.5";
	if (status === BetStatus.WON) {
		return `${base} bg-secondary/10 ring-1 ring-inset ring-secondary/30`;
	}
	if (status === BetStatus.LOST) {
		return `${base} bg-bg-2/40 opacity-50`;
	}
	return `${base} bg-bg-2`;
}
