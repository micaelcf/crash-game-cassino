import { formatCents } from "#/game/money";

export function MoneyDisplay({
	cents,
	suffix = "",
}: {
	cents: string | bigint | null | undefined;
	suffix?: string;
}) {
	return (
		<span className="font-mono">
			{formatCents(cents)}
			{suffix}
		</span>
	);
}
