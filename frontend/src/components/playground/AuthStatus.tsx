import { useLogto } from "@logto/react";

export function AuthStatus() {
	const { isAuthenticated, isLoading, error } = useLogto();
	return (
		<div className="flex flex-wrap gap-2 text-xs">
			<Pill
				label={isLoading ? "auth: loading" : "auth: idle"}
				tone={isLoading ? "amber" : "slate"}
			/>
			<Pill
				label={isAuthenticated ? "signed in" : "signed out"}
				tone={isAuthenticated ? "emerald" : "slate"}
			/>
			{error ? <Pill label={`error: ${error.message}`} tone="rose" /> : null}
		</div>
	);
}

type Tone = "slate" | "emerald" | "amber" | "rose";

const TONE: Record<Tone, string> = {
	slate: "border-slate-700 text-slate-300",
	emerald: "border-emerald-500 text-emerald-300",
	amber: "border-amber-500 text-amber-300",
	rose: "border-rose-500 text-rose-300",
};

export function Pill({ label, tone }: { label: string; tone: Tone }) {
	return (
		<span className={`rounded-full border px-2 py-0.5 ${TONE[tone]}`}>
			{label}
		</span>
	);
}
