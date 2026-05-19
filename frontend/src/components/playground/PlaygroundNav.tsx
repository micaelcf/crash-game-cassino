import { Link } from "@tanstack/react-router";

const LINKS = [
	{ to: "/playground", label: "Overview" },
	{ to: "/playground/auth", label: "Auth" },
	{ to: "/playground/wallet", label: "Wallet" },
	{ to: "/playground/round", label: "Round" },
	{ to: "/playground/bet", label: "Bet" },
	{ to: "/playground/history", label: "History" },
	{ to: "/playground/verify", label: "Verify" },
] as const;

export function PlaygroundNav() {
	return (
		<nav className="flex flex-wrap gap-2 text-xs">
			{LINKS.map(({ to, label }) => (
				<Link
					key={to}
					to={to}
					activeOptions={{ exact: true }}
					className="rounded border border-slate-700 px-2 py-1 hover:bg-slate-800"
					activeProps={{
						className:
							"rounded border border-emerald-500 px-2 py-1 bg-emerald-500/10 text-emerald-200",
					}}>
					{label}
				</Link>
			))}
		</nav>
	);
}
