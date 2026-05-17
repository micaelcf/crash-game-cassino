import type { RoundStatus } from "#/api/types";
import { Pill } from "./AuthStatus";

export function PhaseBadge({ phase }: { phase: RoundStatus | undefined }) {
	const tone =
		phase === "FLYING"
			? "emerald"
			: phase === "CRASHED"
				? "rose"
				: phase === "BETTING_PHASE"
					? "amber"
					: "slate";
	return <Pill label={`phase: ${phase ?? "—"}`} tone={tone} />;
}
