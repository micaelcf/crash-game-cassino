import {
	CrownIcon,
	MedalIcon,
	StarIcon,
	TrophyIcon,
} from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { PlayerHeader } from "#/components/game/PlayerHeader";
import { AppShell } from "#/components/shared/AppShell";
import type { LeaderboardEntryDto } from "#/lib/api/types";
import { LeaderboardWindow } from "#/lib/api/types";
import { useCurrentUserSub } from "#/lib/application/auth/useCurrentUserSub";
import { useLeaderboard } from "#/lib/application/leaderboard/queries";
import { formatCents, formatMultiplier } from "#/lib/domain/money";
import { Cents } from "#/lib/domain/types";

interface LeaderboardSearch {
	window: LeaderboardWindow;
}

export const Route = createFileRoute("/leaderboard")({
	component: LeaderboardPage,
	validateSearch: (raw): LeaderboardSearch => {
		const w = raw.window;
		return {
			window:
				w === LeaderboardWindow.SEVEN_DAYS
					? LeaderboardWindow.SEVEN_DAYS
					: LeaderboardWindow.TWENTY_FOUR_HOURS,
		};
	},
});

const TABS: { code: LeaderboardWindow; label: string; sub: string }[] = [
	{
		code: LeaderboardWindow.TWENTY_FOUR_HOURS,
		label: "24 hours",
		sub: "today",
	},
	{ code: LeaderboardWindow.SEVEN_DAYS, label: "7 days", sub: "this week" },
];

function LeaderboardPage() {
	const { window } = Route.useSearch();
	const query = useLeaderboard(window, 20);
	const userSub = useCurrentUserSub();

	return (
		<AppShell header={<PlayerHeader />}>
			<section className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 lg:px-6 lg:py-10">
				<header className="mb-6 flex flex-col gap-4">
					<div>
						<span className="inline-flex items-center gap-2 rounded-(--radius-pill) bg-(--color-bg-1) px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-(--color-fg-muted) ring-1 ring-inset ring-(--color-border)">
							<TrophyIcon
								size={12}
								weight="fill"
								className="text-(--color-primary)"
							/>
							Hall of fame
						</span>
						<h1 className="mt-3 text-3xl font-black tracking-tighter text-(--color-fg) lg:text-4xl">
							Leaderboard
						</h1>
						<p className="mt-2 max-w-md text-sm leading-relaxed text-(--color-fg-muted)">
							Ranked by gross winnings — wins minus stake on cashed-out bets.
							Refreshed every 30 seconds.
						</p>
					</div>

					<div className="flex items-center gap-2">
						{TABS.map((t) => {
							const active = t.code === window;
							return (
								<Link
									key={t.code}
									to="/leaderboard"
									search={{ window: t.code }}
									className={
										active
											? "rounded-(--radius-pill) bg-(--color-primary) px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-(--color-bg-0) ring-1 ring-inset ring-white/10"
											: "rounded-(--radius-pill) bg-(--color-bg-1) px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-(--color-fg-muted) ring-1 ring-inset ring-(--color-border) transition-colors hover:text-(--color-primary) hover:ring-(--color-primary)/40"
									}
								>
									{t.label}
								</Link>
							);
						})}
						{query.data?.generatedAt && (
							<span className="ml-auto hidden font-mono text-[10px] text-(--color-fg-dim) sm:inline">
								generated{" "}
								{new Date(query.data.generatedAt).toLocaleTimeString()}
							</span>
						)}
					</div>
				</header>

				{query.isPending && <LeaderboardSkeleton />}

				{query.error && (
					<div className="rounded-(--radius-card) bg-(--color-danger)/10 p-6 text-sm text-(--color-danger) ring-1 ring-inset ring-(--color-danger)/40">
						{query.error instanceof Error
							? query.error.message
							: "Failed to load leaderboard."}
					</div>
				)}

				{query.data && query.data.entries.length === 0 && (
					<div className="rounded-(--radius-card) bg-(--color-bg-1) p-12 text-center ring-1 ring-inset ring-(--color-border)/60">
						<StarIcon
							size={32}
							weight="duotone"
							className="mx-auto text-(--color-fg-dim)"
						/>
						<p className="mt-3 text-sm text-(--color-fg-muted)">
							No champions yet. Be the first to cash out big.
						</p>
						<Link
							to="/play"
							className="mt-4 inline-flex rounded-(--radius-pill) bg-(--color-primary) px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-(--color-bg-0)"
						>
							Play now
						</Link>
					</div>
				)}

				{query.data && query.data.entries.length > 0 && (
					<motion.ol
						initial="hidden"
						animate="show"
						variants={{
							hidden: {},
							show: { transition: { staggerChildren: 0.03 } },
						}}
						className="flex flex-col gap-1.5"
					>
						<AnimatePresence initial={false}>
							{query.data.entries.map((entry, idx) => (
								<EntryRow
									key={entry.userId}
									rank={idx + 1}
									entry={entry}
									isMe={entry.userId === userSub}
								/>
							))}
						</AnimatePresence>
					</motion.ol>
				)}
			</section>
		</AppShell>
	);
}

function EntryRow({
	rank,
	entry,
	isMe,
}: {
	rank: number;
	entry: LeaderboardEntryDto;
	isMe: boolean;
}) {
	return (
		<motion.li
			layout
			variants={{
				hidden: { opacity: 0, x: -10 },
				show: { opacity: 1, x: 0 },
			}}
			transition={{ type: "spring", stiffness: 220, damping: 24 }}
			className={
				isMe
					? "grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-(--radius-card) bg-(--color-primary)/10 px-4 py-3 ring-2 ring-inset ring-(--color-primary)/50 md:grid-cols-[3rem_1fr_8rem_6rem_5rem]"
					: "grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-(--radius-card) bg-(--color-bg-1) px-4 py-3 ring-1 ring-inset ring-(--color-border)/60 transition-colors hover:bg-(--color-bg-2)/50 md:grid-cols-[3rem_1fr_8rem_6rem_5rem]"
			}
		>
			<Rank rank={rank} />
			<div className="flex min-w-0 flex-col">
				<span className="truncate text-sm font-bold text-(--color-fg)">
					{entry.username}
					{isMe && (
						<span className="ml-2 rounded-(--radius-pill) bg-(--color-primary)/20 px-1.5 py-0.5 align-middle text-[9px] font-black uppercase tracking-widest text-(--color-primary)">
							you
						</span>
					)}
				</span>
				<span className="font-mono text-[10px] text-(--color-fg-dim)">
					{entry.userId.slice(0, 12)}
				</span>
			</div>
			<span className="font-mono text-sm font-black tabular-nums text-(--color-secondary) md:text-right">
				+{formatCents(Cents(BigInt(entry.winningsCents)))}
			</span>
			<span className="hidden font-mono text-xs text-(--color-fg-muted) md:inline md:text-right">
				{entry.betsCount} bet{entry.betsCount === 1 ? "" : "s"}
			</span>
			<span className="hidden font-mono text-xs font-bold tabular-nums text-(--color-primary) md:inline md:text-right">
				{formatMultiplier(entry.biggestMultiplierHundredths)}
			</span>
		</motion.li>
	);
}

function Rank({ rank }: { rank: number }) {
	if (rank === 1) {
		return (
			<span className="flex size-9 items-center justify-center rounded-(--radius-control) bg-(--color-primary)/20 ring-1 ring-inset ring-(--color-primary)/50">
				<CrownIcon size={18} weight="fill" className="text-(--color-primary)" />
			</span>
		);
	}
	if (rank === 2 || rank === 3) {
		return (
			<span className="flex size-9 items-center justify-center rounded-(--radius-control) bg-(--color-bg-2) ring-1 ring-inset ring-(--color-border)">
				<MedalIcon
					size={16}
					weight="duotone"
					className={
						rank === 2
							? "text-(--color-fg-muted)"
							: "text-(--color-accent-amber)"
					}
				/>
			</span>
		);
	}
	return (
		<span className="flex size-9 items-center justify-center rounded-(--radius-control) bg-(--color-bg-2) font-mono text-xs font-bold tabular-nums text-(--color-fg-muted) ring-1 ring-inset ring-(--color-border)/60">
			{rank}
		</span>
	);
}

function LeaderboardSkeleton() {
	return (
		<div className="flex flex-col gap-1.5">
			{Array.from({ length: 8 }, (_, i) => `skel-${i}`).map((id) => (
				<div
					key={id}
					className="h-14 animate-pulse rounded-(--radius-card) bg-(--color-bg-1)/70"
				/>
			))}
		</div>
	);
}
