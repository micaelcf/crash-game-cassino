import { createFileRoute, Link } from "@tanstack/react-router";
import { JsonView } from "#/components/playground/JsonView";
import { Section } from "#/components/playground/Section";
import { env } from "#/env";

export const Route = createFileRoute("/playground/")({
	component: PlaygroundIndex,
});

function PlaygroundIndex() {
	return (
		<div className="grid gap-4 md:grid-cols-2">
			<Section
				title="What this page is for"
				description="A scratchpad to exercise each functional requirement before any UI work."
			>
				<p>
					Each section under <code>/playground</code> drives one piece of the
					contract end-to-end against the running backend. Use 3 browser
					profiles (each signed in as a different Logto user) to simulate 3
					players in one round — a single browser shares cookies, so the backend
					would reject the 2nd bet as a duplicate.
				</p>
				<ul className="list-disc space-y-1 pl-5 text-slate-300 text-xs">
					<li>
						<Link to="/playground/auth" className="underline">
							/auth
						</Link>{" "}
						— Logto sign-in, JWT claims, access-token preview
					</li>
					<li>
						<Link to="/playground/wallet" className="underline">
							/wallet
						</Link>{" "}
						— create wallet, fetch balance
					</li>
					<li>
						<Link to="/playground/round" className="underline">
							/round
						</Link>{" "}
						— live current round + raw WS event log
					</li>
					<li>
						<Link to="/playground/bet" className="underline">
							/bet
						</Link>{" "}
						— place bet, projected multiplier, cash out
					</li>
					<li>
						<Link to="/playground/history" className="underline">
							/history
						</Link>{" "}
						— past rounds, my bets
					</li>
					<li>
						<Link to="/playground/verify" className="underline">
							/verify
						</Link>{" "}
						— recompute crash point client-side
					</li>
				</ul>
			</Section>

			<Section title="Environment seen by the client">
				<JsonView
					value={{
						VITE_API_BASE_URL: env.VITE_API_BASE_URL,
						VITE_WS_URL: env.VITE_WS_URL,
						VITE_LOGTO_ENDPOINT: env.VITE_LOGTO_ENDPOINT,
						VITE_LOGTO_APP_ID: env.VITE_LOGTO_APP_ID,
						VITE_LOGTO_RESOURCE: env.VITE_LOGTO_RESOURCE ?? null,
					}}
				/>
			</Section>
		</div>
	);
}
