import { TrophyIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
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
		<section className="flex flex-col gap-2 rounded-(--radius-card) bg-(--color-bg-1) p-4 ring-1 ring-inset ring-(--color-border)/70 shadow-(--shadow-card)">
			<header className="flex items-baseline justify-between">
				<h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-(--color-fg-muted)">
					<UsersThreeIcon
						size={14}
						weight="duotone"
						className="text-(--color-primary)"
					/>
					Round bets
				</h2>
				<span className="font-mono text-[11px] tabular-nums text-(--color-fg-dim)">
					{sorted.length} player{sorted.length === 1 ? "" : "s"}
				</span>
			</header>

			{sorted.length === 0 && (
				<p className="py-8 text-center text-xs text-(--color-fg-dim)">
					Be the first to place a bet.
				</p>
			)}

			<ul className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
				<AnimatePresence initial={false}>
					{sorted.map((bet) => (
						<motion.li
							key={bet.id}
							layout
							initial={{ opacity: 0, x: -8 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: 8 }}
							transition={{ type: "spring", stiffness: 260, damping: 22 }}
							className={rowClass(bet.status)}
						>
							<span className="flex min-w-0 items-center gap-1.5">
								{bet.status === BetStatus.WON && (
									<TrophyIcon
										size={12}
										weight="fill"
										className="shrink-0 text-(--color-secondary)"
									/>
								)}
								<span className="truncate text-xs font-semibold text-(--color-fg)">
									{bet.username ?? bet.userId.slice(0, 8)}
								</span>
							</span>
							<span className="flex items-center gap-2 font-mono text-xs tabular-nums">
								<span className="text-(--color-fg-muted)">
									{formatCents(Cents(BigInt(bet.amountCents)))}
								</span>
								{bet.status === BetStatus.WON && bet.payoutCents != null && (
									<span className="text-(--color-secondary)">
										→ {formatCents(Cents(BigInt(bet.payoutCents)))}{" "}
										<span className="text-(--color-fg-dim)">
											@ {formatMultiplier(bet.cashoutMultiplierHundredths)}
										</span>
									</span>
								)}
							</span>
						</motion.li>
					))}
				</AnimatePresence>
			</ul>
		</section>
	);
}

function rowClass(status: BetStatus): string {
	const base =
		"flex items-center justify-between rounded-(--radius-control) px-2.5 py-1.5";
	if (status === BetStatus.WON) {
		return `${base} bg-(--color-secondary)/10 ring-1 ring-inset ring-(--color-secondary)/30`;
	}
	if (status === BetStatus.LOST) {
		return `${base} bg-(--color-bg-2)/40 opacity-50`;
	}
	return `${base} bg-(--color-bg-2)`;
}
