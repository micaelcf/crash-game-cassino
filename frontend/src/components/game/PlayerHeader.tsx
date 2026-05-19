import { type IdTokenClaims, useLogto } from "@logto/react";
import {
	ClockCounterClockwiseIcon,
	type Icon,
	LightningIcon,
	ListIcon,
	PlayIcon,
	ReceiptIcon,
	SignInIcon,
	SignOutIcon,
	TrophyIcon,
	WalletIcon,
	XIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button, Tooltip } from "#/components/ui";
import {
	getCallbackUrl,
	getPostSignOutUrl,
} from "#/lib/application/auth/config";
import { useMyWallet } from "#/lib/application/wallet/queries";
import { formatCents } from "#/lib/domain/money";
import { Cents } from "#/lib/domain/types";
import { useSocket } from "#/providers/SocketProvider";

type NavItem = { to: string; label: string; icon: Icon };

const PUBLIC_NAV: readonly NavItem[] = [
	{ to: "/leaderboard", label: "Leaderboard", icon: TrophyIcon },
	{ to: "/history", label: "History", icon: ClockCounterClockwiseIcon },
] as const;

const AUTHED_NAV: readonly NavItem[] = [
	{ to: "/play", label: "Play", icon: PlayIcon },
	{ to: "/leaderboard", label: "Leaderboard", icon: TrophyIcon },
	{ to: "/history", label: "History", icon: ClockCounterClockwiseIcon },
	{ to: "/me", label: "My bets", icon: ReceiptIcon },
] as const;

export function PlayerHeader() {
	const { isAuthenticated, signIn, signOut, getIdTokenClaims } = useLogto();
	const wallet = useMyWallet();
	const { status } = useSocket();
	const [claims, setClaims] = useState<IdTokenClaims | undefined>();
	const [mobileOpen, setMobileOpen] = useState(false);

	useEffect(() => {
		if (!isAuthenticated) {
			setClaims(undefined);
			return;
		}
		void (async () => setClaims(await getIdTokenClaims()))();
	}, [isAuthenticated, getIdTokenClaims]);

	const balance = wallet.data ? Cents(BigInt(wallet.data.balance)) : null;
	const name = claims?.username ?? claims?.name ?? "player";
	const nav = isAuthenticated ? AUTHED_NAV : PUBLIC_NAV;

	return (
		<header className="sticky top-0 z-20 border-b border-border/60 bg-bg-0/85 backdrop-blur-md">
			<div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
				<div className="flex items-center gap-3 lg:gap-6">
					<Link to="/" className="group flex items-center gap-2 text-fg">
						<motion.span
							className="relative flex size-9 items-center justify-center rounded-control bg-primary/15 ring-1 ring-inset ring-primary/40"
							whileHover={{ rotate: -6 }}
							transition={{ type: "spring", stiffness: 300, damping: 18 }}>
							<LightningIcon size={20} weight="fill" className="text-primary" />
						</motion.span>
						<span className="flex items-baseline gap-1 font-black uppercase">
							<span className="text-lg tracking-tighter text-fg">Crash</span>
							<span className="hidden text-[10px] font-bold tracking-[0.3em] text-primary sm:inline">
								Vegas
							</span>
						</span>
					</Link>

					<nav className="hidden items-center gap-1 text-xs md:flex">
						{nav.map((item) => (
							<NavLink key={item.to} to={item.to}>
								{item.label}
							</NavLink>
						))}
					</nav>
				</div>

				<div className="flex items-center gap-2 lg:gap-3">
					<SocketPill status={status} />

					{isAuthenticated && (
						<>
							<Tooltip label="Wallet balance">
								<div className="flex items-center gap-2 rounded-pill bg-bg-1 px-3 py-1.5 ring-1 ring-inset ring-border">
									<WalletIcon
										size={14}
										weight="duotone"
										className="text-secondary"
									/>
									<span className="font-mono text-sm font-bold tabular-nums text-secondary">
										{wallet.isPending ? "…" : formatCents(balance)}
									</span>
								</div>
							</Tooltip>

							<span className="hidden font-mono text-xs text-fg-muted lg:inline">
								{name}
							</span>

							<Button
								variant="ghost"
								size="sm"
								className="hidden md:inline-flex"
								onClick={() => signOut(getPostSignOutUrl())}>
								<SignOutIcon size={14} weight="bold" />
								Sign out
							</Button>
						</>
					)}

					{!isAuthenticated && (
						<Button
							variant="primary"
							size="sm"
							className="hidden md:inline-flex"
							onClick={() => signIn(getCallbackUrl())}>
							<SignInIcon size={14} weight="bold" />
							Sign in
						</Button>
					)}

					<button
						type="button"
						aria-label="Open menu"
						aria-expanded={mobileOpen}
						onClick={() => setMobileOpen((v) => !v)}
						className="inline-flex size-9 items-center justify-center rounded-control bg-bg-1 text-fg ring-1 ring-inset ring-border md:hidden">
						{mobileOpen ? <XIcon size={18} /> : <ListIcon size={18} />}
					</button>
				</div>
			</div>

			<AnimatePresence>
				{mobileOpen && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ type: "spring", stiffness: 320, damping: 32 }}
						className="overflow-hidden border-t border-border/60 bg-bg-1 md:hidden">
						<div className="flex flex-col gap-2 px-4 py-3">
							{nav.map((item) => {
								const ItemIcon = item.icon;
								return (
									<Link
										key={item.to}
										to={item.to}
										onClick={() => setMobileOpen(false)}
										className="flex items-center gap-3 rounded-control px-3 py-2 text-sm text-fg-muted hover:bg-bg-2 hover:text-fg data-[status=active]:bg-primary/10 data-[status=active]:text-primary"
										activeProps={{ "data-status": "active" }}>
										<ItemIcon size={18} weight="duotone" />
										{item.label}
									</Link>
								);
							})}
							<div className="mt-1 flex items-center justify-end border-t border-border/60 pt-3">
								{isAuthenticated ? (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => signOut(getPostSignOutUrl())}>
										<SignOutIcon size={14} weight="bold" />
										Sign out
									</Button>
								) : (
									<Button
										variant="primary"
										size="sm"
										onClick={() => signIn(getCallbackUrl())}>
										<SignInIcon size={14} weight="bold" />
										Sign in
									</Button>
								)}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</header>
	);
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
	return (
		<Link
			to={to}
			className="rounded-pill px-3 py-1.5 text-fg-muted transition-colors hover:bg-bg-2 hover:text-fg data-[status=active]:bg-primary/15 data-[status=active]:text-primary"
			activeProps={{ "data-status": "active" }}>
			{children}
		</Link>
	);
}

const STATUS_META: Record<
	string,
	{ color: string; label: string; pulse: boolean }
> = {
	idle: { color: "--color-fg-dim", label: "Idle", pulse: false },
	connecting: {
		color: "--color-accent-amber",
		label: "Linking",
		pulse: true,
	},
	connected: { color: "--color-secondary", label: "Live", pulse: true },
	disconnected: {
		color: "--color-danger",
		label: "Offline",
		pulse: false,
	},
};

function SocketPill({ status }: { status: string }) {
	const meta = STATUS_META[status] ?? STATUS_META.idle;
	return (
		<Tooltip label={`Realtime ${meta.label.toLowerCase()}`}>
			<output
				aria-live="polite"
				className="hidden items-center gap-1.5 rounded-pill bg-bg-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-fg-muted ring-1 ring-inset ring-border sm:inline-flex">
				<motion.span
					className="size-1.5 rounded-full"
					style={{ backgroundColor: `var(${meta.color})` }}
					animate={meta.pulse ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
					transition={{
						repeat: meta.pulse ? Infinity : 0,
						duration: 1.4,
					}}
				/>
				{meta.label}
			</output>
		</Tooltip>
	);
}
