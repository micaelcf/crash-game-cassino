import { useLogto } from "@logto/react";
import {
	ArrowRightIcon,
	ChartLineUpIcon,
	LightningIcon,
	ShieldCheckIcon,
} from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { HistoryStrip } from "#/components/game/HistoryStrip";
import { AppShell } from "#/components/shared/AppShell";
import { useRoundHistory } from "#/lib/application/rounds/queries";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const { isAuthenticated } = useLogto();
	const history = useRoundHistory({ page: 1, pageSize: 20 });

	return (
		<AppShell>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh] overflow-hidden"
			>
				<div className="absolute -left-32 top-10 size-[36rem] rounded-full bg-(--color-primary)/15 blur-3xl" />
				<div className="absolute right-0 top-40 size-[28rem] rounded-full bg-(--color-secondary)/10 blur-3xl" />
			</div>

			<header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 pt-6 lg:px-6">
				<Link to="/" className="flex items-center gap-2">
					<span className="flex size-10 items-center justify-center rounded-(--radius-control) bg-(--color-primary)/15 ring-1 ring-inset ring-(--color-primary)/40">
						<LightningIcon
							size={22}
							weight="fill"
							className="text-(--color-primary)"
						/>
					</span>
					<span className="flex items-baseline gap-1.5 font-black uppercase">
						<span className="text-xl tracking-tighter text-(--color-fg)">
							Crash
						</span>
						<span className="text-[10px] font-bold tracking-[0.3em] text-(--color-primary)">
							Vegas
						</span>
					</span>
				</Link>
				<Link
					to={isAuthenticated ? "/play" : "/login"}
					className="rounded-(--radius-pill) bg-(--color-bg-1) px-4 py-2 text-xs font-bold text-(--color-fg) ring-1 ring-inset ring-(--color-border) transition-colors hover:bg-(--color-primary)/10 hover:text-(--color-primary) hover:ring-(--color-primary)/40"
				>
					{isAuthenticated ? "Enter" : "Sign in"}
				</Link>
			</header>

			<section className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-center gap-12 px-4 py-12 lg:grid-cols-12 lg:px-6 lg:py-20">
				<div className="lg:col-span-7">
					<motion.span
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.05, duration: 0.5 }}
						className="inline-flex items-center gap-2 rounded-(--radius-pill) bg-(--color-bg-1) px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-(--color-fg-muted) ring-1 ring-inset ring-(--color-border)"
					>
						<span className="size-1.5 rounded-full bg-(--color-secondary)" />
						Provably fair · Live tonight
					</motion.span>

					<motion.h1
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1, duration: 0.6 }}
						className="mt-6 font-black uppercase leading-[0.85] tracking-tighter text-(--color-fg)"
					>
						<span className="block text-6xl sm:text-7xl lg:text-8xl">Push</span>
						<span className="-ml-1 block text-7xl text-(--color-primary) drop-shadow-[0_0_30px_oklch(74%_0.19_55_/_0.35)] sm:text-8xl lg:ml-[0.5em] lg:text-[10rem]">
							Crash
						</span>
						<span className="block text-6xl sm:text-7xl lg:text-8xl">
							your luck
						</span>
					</motion.h1>

					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.25, duration: 0.5 }}
						className="mt-6 max-w-md text-base leading-relaxed text-(--color-fg-muted)"
					>
						Place a bet. Watch the multiplier climb. Cash out before it blows.
						Every round verifiable, every cent precise.
					</motion.p>

					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.35, duration: 0.5 }}
						className="mt-8 flex flex-wrap items-center gap-3"
					>
						<Link
							to={isAuthenticated ? "/play" : "/login"}
							className="group inline-flex h-12 items-center gap-2 rounded-(--radius-control) bg-(--color-primary) px-6 text-sm font-bold text-(--color-bg-0) ring-1 ring-inset ring-white/10 transition-[transform,filter] hover:bg-(--color-primary-hot) hover:brightness-110 active:translate-y-[1px]"
						>
							<LightningIcon size={16} weight="fill" />
							{isAuthenticated ? "Enter the game" : "Sign in to play"}
							<ArrowRightIcon
								size={14}
								weight="bold"
								className="transition-transform group-hover:translate-x-0.5"
							/>
						</Link>
						<Link
							to="/history"
							className="inline-flex h-12 items-center gap-2 rounded-(--radius-control) bg-transparent px-6 text-sm font-bold text-(--color-fg) ring-1 ring-inset ring-(--color-border) transition-colors hover:text-(--color-primary) hover:ring-(--color-primary)"
						>
							<ChartLineUpIcon size={16} weight="bold" />
							Round history
						</Link>
					</motion.div>

					<motion.dl
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.5, duration: 0.6 }}
						className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-(--color-border)/60 pt-6"
					>
						<Stat label="Min bet" value="1.00" />
						<Stat label="Max bet" value="1k" />
						<Stat label="House edge" value="1%" />
					</motion.dl>
				</div>

				<motion.aside
					initial={{ opacity: 0, x: 16 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.3, duration: 0.6 }}
					className="lg:col-span-5"
				>
					<div className="rounded-(--radius-card) bg-(--color-bg-1) p-6 ring-1 ring-inset ring-(--color-border)/60 shadow-(--shadow-card)">
						<header className="flex items-center justify-between">
							<h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-(--color-fg-muted)">
								<ChartLineUpIcon
									size={14}
									weight="duotone"
									className="text-(--color-primary)"
								/>
								Last rounds
							</h2>
							<span className="font-mono text-[10px] text-(--color-fg-dim)">
								Live
							</span>
						</header>
						<div className="mt-4">
							<HistoryStrip rounds={history.data?.items ?? []} />
						</div>

						<div className="mt-6 flex items-start gap-3 rounded-(--radius-control) bg-(--color-bg-0) p-4 ring-1 ring-inset ring-(--color-border)/60">
							<ShieldCheckIcon
								size={18}
								weight="duotone"
								className="mt-0.5 shrink-0 text-(--color-secondary)"
							/>
							<div className="text-xs leading-relaxed text-(--color-fg-muted)">
								<p className="mb-1 font-bold uppercase tracking-widest text-(--color-fg)">
									Provably fair
								</p>
								<p>
									Every round's crash point is committed via HMAC before bets
									open. Verify any past round by hash.
								</p>
							</div>
						</div>
					</div>
				</motion.aside>
			</section>
		</AppShell>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-1">
			<dt className="text-[10px] font-bold uppercase tracking-[0.25em] text-(--color-fg-dim)">
				{label}
			</dt>
			<dd className="font-mono text-2xl font-black tabular-nums text-(--color-fg)">
				{value}
			</dd>
		</div>
	);
}
