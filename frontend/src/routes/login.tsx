import { useLogto } from "@logto/react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { getCallbackUrl } from "#/auth/logto-config";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
	const { isAuthenticated, isLoading, signIn } = useLogto();

	if (isLoading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
				<p>Loading...</p>
			</main>
		);
	}

	if (isAuthenticated) {
		return <Navigate to="/dashboard" />;
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
			<div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
				<h1 className="text-3xl font-bold tracking-tight">Crash Game</h1>
				<p className="mt-2 text-sm text-slate-400">
					Sign in to place bets and cash out before the crash.
				</p>
				<button
					type="button"
					onClick={() => signIn(getCallbackUrl())}
					className="mt-6 w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
				>
					Sign in with Logto
				</button>
			</div>
		</main>
	);
}
