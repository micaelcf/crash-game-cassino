import { useLogto } from "@logto/react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const { isAuthenticated } = useLogto();

	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-center text-slate-100">
			<h1 className="text-5xl font-bold tracking-tight">Crash Game</h1>
			<p className="max-w-xl text-slate-400">
				Place a bet, watch the multiplier climb, and cash out before it crashes.
			</p>

			<div className="flex flex-wrap justify-center gap-3">
				{isAuthenticated ? (
					<Link
						to="/dashboard"
						className="rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400"
					>
						Go to dashboard
					</Link>
				) : (
					<Link
						to="/login"
						className="rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400"
					>
						Sign in
					</Link>
				)}
				<Link
					to="/playground"
					className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-slate-200 hover:bg-slate-900"
				>
					Open playground
				</Link>
			</div>
		</main>
	);
}
