import { useLogto } from "@logto/react";
import {
	LightningIcon,
	ShieldCheckIcon,
	SignInIcon,
} from "@phosphor-icons/react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { AppShell } from "#/components/shared/AppShell";
import { Button } from "#/components/ui";
import { getCallbackUrl } from "#/lib/application/auth/config";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
	const { isAuthenticated, isLoading, signIn } = useLogto();

	if (isLoading) {
		return (
			<AppShell>
				<div className="flex flex-1 items-center justify-center text-(--color-fg-muted)">
					Loading…
				</div>
			</AppShell>
		);
	}

	if (isAuthenticated) {
		return <Navigate to="/play" />;
	}

	return (
		<AppShell>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[80vh] overflow-hidden"
			>
				<div className="absolute -left-32 top-40 size-[40rem] rounded-full bg-(--color-primary)/15 blur-3xl" />
				<div className="absolute -right-20 bottom-0 size-[28rem] rounded-full bg-(--color-secondary)/10 blur-3xl" />
			</div>

			<div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-12 px-4 py-10 lg:grid-cols-2 lg:px-6">
				<div className="hidden flex-col gap-6 lg:flex">
					<Link to="/" className="flex items-center gap-2">
						<span className="flex size-10 items-center justify-center rounded-(--radius-control) bg-(--color-primary)/15 ring-1 ring-inset ring-(--color-primary)/40">
							<LightningIcon
								size={22}
								weight="fill"
								className="text-(--color-primary)"
							/>
						</span>
						<span className="text-xl font-black uppercase tracking-tighter text-(--color-fg)">
							Crash
						</span>
					</Link>

					<motion.h1
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						className="font-black uppercase leading-[0.85] tracking-tighter"
					>
						<span className="block text-7xl text-(--color-fg)">Bet,</span>
						<span className="block text-7xl text-(--color-primary)">cash,</span>
						<span className="block text-7xl text-(--color-fg)">repeat.</span>
					</motion.h1>

					<p className="max-w-sm text-sm leading-relaxed text-(--color-fg-muted)">
						Single sign-on via Logto. Tokens are short-lived. House edge is 1% —
						published and verifiable.
					</p>
				</div>

				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="mx-auto w-full max-w-md"
				>
					<div className="rounded-(--radius-card) bg-(--color-bg-1)/95 p-8 shadow-(--shadow-card) ring-1 ring-inset ring-(--color-border) backdrop-blur-xl">
						<Link
							to="/"
							className="mb-6 inline-flex items-center gap-2 text-xs text-(--color-fg-muted) hover:text-(--color-primary) lg:hidden"
						>
							<LightningIcon
								size={14}
								weight="fill"
								className="text-(--color-primary)"
							/>
							Crash
						</Link>

						<span className="inline-flex items-center gap-2 rounded-(--radius-pill) bg-(--color-bg-0) px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-(--color-fg-muted) ring-1 ring-inset ring-(--color-border)">
							<SignInIcon size={12} weight="bold" />
							Welcome back
						</span>
						<h2 className="mt-4 text-3xl font-black tracking-tight text-(--color-fg)">
							Sign in to play
						</h2>
						<p className="mt-2 text-sm text-(--color-fg-muted)">
							Place bets, watch the multiplier climb, cash out before it
							crashes.
						</p>

						<Button
							variant="primary"
							size="lg"
							onClick={() => signIn(getCallbackUrl())}
							className="mt-8 w-full"
						>
							<SignInIcon size={16} weight="bold" />
							Continue with Logto
						</Button>

						<div className="mt-6 flex items-start gap-3 rounded-(--radius-control) bg-(--color-bg-0) p-3 ring-1 ring-inset ring-(--color-border)/60">
							<ShieldCheckIcon
								size={16}
								weight="duotone"
								className="mt-0.5 shrink-0 text-(--color-secondary)"
							/>
							<p className="text-[11px] leading-relaxed text-(--color-fg-muted)">
								OIDC with PKCE. Your session is held by the browser only — no
								password stored here.
							</p>
						</div>
					</div>
				</motion.div>
			</div>
		</AppShell>
	);
}
