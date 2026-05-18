import { type IdTokenClaims, useLogto } from "@logto/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPostSignOutUrl } from "#/lib/application/auth/config";
import { useRequireAuth } from "#/lib/application/auth/useRequireAuth";

export const Route = createFileRoute("/dashboard")({
	component: DashboardPage,
});

function DashboardPage() {
	const { isAuthenticated, isLoading } = useRequireAuth("/login");
	const { getIdTokenClaims, signOut } = useLogto();
	const [claims, setClaims] = useState<IdTokenClaims>();

	useEffect(() => {
		if (!isAuthenticated) return;
		void (async () => {
			const next = await getIdTokenClaims();
			setClaims(next);
		})();
	}, [isAuthenticated, getIdTokenClaims]);

	if (isLoading || !isAuthenticated) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
				<p>Loading...</p>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-slate-950 text-slate-100">
			<header className="flex items-center justify-between border-b border-slate-800 px-8 py-4">
				<h1 className="text-2xl font-bold">Dashboard</h1>
				<button
					type="button"
					onClick={() => signOut(getPostSignOutUrl())}
					className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium hover:border-slate-500 hover:bg-slate-900"
				>
					Sign out
				</button>
			</header>

			<section className="px-8 py-6">
				<h2 className="text-lg font-semibold">
					Welcome{claims?.name ? `, ${claims.name}` : ""}
				</h2>
				<p className="mt-1 text-sm text-slate-400">
					Subject: <code className="text-slate-200">{claims?.sub ?? "—"}</code>
				</p>
				{claims?.email && (
					<p className="mt-1 text-sm text-slate-400">
						Email: <code className="text-slate-200">{claims.email}</code>
					</p>
				)}

				<details className="mt-6">
					<summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-200">
						Raw ID token claims
					</summary>
					<pre className="mt-3 overflow-auto rounded-lg border border-slate-800 bg-slate-900 p-4 text-xs">
						{JSON.stringify(claims, null, 2)}
					</pre>
				</details>
			</section>
		</main>
	);
}
