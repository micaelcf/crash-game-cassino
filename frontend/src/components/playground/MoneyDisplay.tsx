import { formatCents } from "#/lib/domain/money";
import type { Cents } from "#/lib/domain/types";

export function MoneyDisplay({
	cents,
	suffix = "",
}: {
	cents: Cents | string | null | undefined;
	suffix?: string | undefined;
}) {
	return (
		<span className="font-mono">
			{formatCents(cents)}
			{suffix}
		</span>
	);
}
