import { type IdTokenClaims, useLogto } from "@logto/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { JsonView } from "#/components/playground/JsonView";
import { Section } from "#/components/playground/Section";
import { env } from "#/env";
import {
	getCallbackUrl,
	getPostSignOutUrl,
} from "#/lib/application/auth/config";

export const Route = createFileRoute("/playground/auth")({
	component: AuthSection,
});

function AuthSection() {
	const { isAuthenticated, signIn, signOut, getIdTokenClaims, getAccessToken } =
		useLogto();
	const [claims, setClaims] = useState<IdTokenClaims>();
	const [token, setToken] = useState<string | undefined>();
	const [tokenErr, setTokenErr] = useState<string | null>(null);

	useEffect(() => {
		if (!isAuthenticated) {
			setClaims(undefined);
			setToken(undefined);
			return;
		}
		void getIdTokenClaims().then(setClaims);
	}, [isAuthenticated, getIdTokenClaims]);

	const fetchToken = async () => {
		setTokenErr(null);
		try {
			const t = await getAccessToken(env.VITE_LOGTO_RESOURCE);
			setToken(t);
		} catch (err) {
			setTokenErr(err instanceof Error ? err.message : String(err));
		}
	};

	return (
		<div className="space-y-4">
			<Section
				title="Sign-in"
				actions={
					isAuthenticated ? (
						<button
							type="button"
							onClick={() => signOut(getPostSignOutUrl())}
							className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
						>
							Sign out
						</button>
					) : (
						<button
							type="button"
							onClick={() => signIn(getCallbackUrl())}
							className="rounded bg-emerald-500 px-2 py-1 font-semibold text-slate-950 text-xs"
						>
							Sign in
						</button>
					)
				}
			>
				<p className="text-slate-300">
					{isAuthenticated
						? "Authenticated — claims below."
						: "Not authenticated. Sign in to drive the rest of the sections."}
				</p>
			</Section>

			<Section title="ID token claims">
				<JsonView value={claims ?? null} />
			</Section>

			<Section
				title="Access token"
				description={`Audience: ${env.VITE_LOGTO_RESOURCE ?? "(none — backend may reject)"}`}
				actions={
					<button
						type="button"
						onClick={fetchToken}
						disabled={!isAuthenticated}
						className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800 disabled:opacity-50"
					>
						Get access token
					</button>
				}
			>
				{tokenErr ? <p className="text-rose-400 text-xs">{tokenErr}</p> : null}
				<JsonView
					value={
						token
							? { length: token.length, preview: `${token.slice(0, 32)}…` }
							: null
					}
				/>
			</Section>
		</div>
	);
}
