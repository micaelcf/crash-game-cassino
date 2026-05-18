import { RoundStatus } from "#/lib/api/types";
import { Pill } from "./AuthStatus";

export function PhaseBadge({ phase }: { phase: RoundStatus | undefined }) {
	const tone =
		phase === RoundStatus.FLYING
			? "emerald"
			: phase === RoundStatus.CRASHED
				? "rose"
				: phase === RoundStatus.BETTING_PHASE
					? "amber"
					: "slate";
	return <Pill label={`phase: ${phase ?? "—"}`} tone={tone} />;
}
