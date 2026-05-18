import { ArrowRightIcon, CrownIcon, TrophyIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { LeaderboardWindow } from "#/lib/api/types";
import { useCurrentUserSub } from "#/lib/application/auth/useCurrentUserSub";
import { useLeaderboard } from "#/lib/application/leaderboard/queries";
import { formatCents } from "#/lib/domain/money";
import { Cents } from "#/lib/domain/types";

export function LeaderboardMini() {
	const query = useLeaderboard(LeaderboardWindow.TWENTY_FOUR_HOURS, 5);
	const userSub = useCurrentUserSub();
	const entries = query.data?.entries ?? [];

	return (
		<section className="flex flex-col gap-3 rounded-(--radius-card) bg-(--color-bg-1) p-4 ring-1 ring-inset ring-(--color-border)/70 shadow-(--shadow-card)">
			<header className="flex items-center justify-between">
				<h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-(--color-fg-muted)">
					<TrophyIcon
						size={14}
						weight="duotone"
						className="text-(--color-primary)"
					/>
					Top 24h
				</h2>
				<Link
					to="/leaderboard"
					search={{ window: LeaderboardWindow.TWENTY_FOUR_HOURS }}
					className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-(--color-fg-muted) transition-colors hover:text-(--color-primary)"
				>
					See all
					<ArrowRightIcon size={10} weight="bold" />
				</Link>
			</header>

			{query.isPending && (
				<ul className="flex flex-col gap-1.5">
					{Array.from({ length: 5 }, (_, i) => `mini-skel-${i}`).map((id) => (
						<li
							key={id}
							className="h-9 animate-pulse rounded-(--radius-control) bg-(--color-bg-2)/60"
						/>
					))}
				</ul>
			)}

			{query.data && entries.length === 0 && (
				<p className="py-6 text-center text-xs text-(--color-fg-dim)">
					No champions yet today.
				</p>
			)}

			{entries.length > 0 && (
				<ol className="flex flex-col gap-1">
					{entries.map((e, idx) => {
						const isMe = e.userId === userSub;
						const rank = idx + 1;
						return (
							<motion.li
								key={e.userId}
								layout
								initial={{ opacity: 0, x: -6 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{
									type: "spring",
									stiffness: 240,
									damping: 22,
									delay: idx * 0.04,
								}}
								className={
									isMe
										? "flex items-center justify-between rounded-(--radius-control) bg-(--color-primary)/15 px-2.5 py-1.5 text-xs ring-1 ring-inset ring-(--color-primary)/40"
										: "flex items-center justify-between rounded-(--radius-control) bg-(--color-bg-2)/60 px-2.5 py-1.5 text-xs"
								}
							>
								<span className="flex min-w-0 items-center gap-2">
									{rank === 1 ? (
										<CrownIcon
											size={11}
											weight="fill"
											className="shrink-0 text-(--color-primary)"
										/>
									) : (
										<span className="w-3 shrink-0 font-mono text-[10px] font-bold text-(--color-fg-dim)">
											{rank}
										</span>
									)}
									<span className="truncate font-semibold text-(--color-fg)">
										{e.username}
									</span>
									{isMe && (
										<span className="rounded-(--radius-pill) bg-(--color-primary)/20 px-1 text-[8px] font-black uppercase tracking-widest text-(--color-primary)">
											you
										</span>
									)}
								</span>
								<span className="font-mono text-xs font-bold tabular-nums text-(--color-secondary)">
									+{formatCents(Cents(BigInt(e.winningsCents)))}
								</span>
							</motion.li>
						);
					})}
				</ol>
			)}
		</section>
	);
}
