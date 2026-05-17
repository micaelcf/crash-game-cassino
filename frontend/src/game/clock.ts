export function computeClockOffset(serverIso: string): number {
	const serverMs = Date.parse(serverIso);
	if (!Number.isFinite(serverMs)) return 0;
	return Date.now() - serverMs;
}
