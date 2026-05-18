/**
 * Provably-fair formula, mirrored from
 * services/games/src/domain/round/provably-fair.service.ts.
 *
 * Pipeline:
 *   h13   = parseInt(HMAC-SHA256(serverSeed, clientSeed).slice(0, 13), 16)
 *   crash = max(1, floor((100·2^52 − h13) / (2^52 − h13)) / 100)
 *   hundredths = floor(crash · 100)
 *
 * House edge = 1% (encoded via the `100·2^52 − h13` numerator).
 */

export const FORMULA_LINES: readonly string[] = [
	"h = HMAC-SHA256(serverSeed, clientSeed)",
	"h13 = parseInt(h.slice(0, 13), 16)",
	"crash = max(1, floor((100·2^52 − h13) / (2^52 − h13)) / 100)",
	"crashPointHundredths = floor(crash · 100)",
] as const;

export const CURVE_FORMULA = "m(t) = e^(r · t)";
export const CURVE_DESCRIPTION =
	"The multiplier rises continuously from 1.00x. r is the per-second growth rate the server pushes when the round starts.";
export const FAIRNESS_DESCRIPTION =
	"The crash point is committed via SHA-256 hash before bets open. After the round ends, the server seed is revealed so you can replay the HMAC and confirm the result was pre-determined.";

const TWO_POW_52 = 2 ** 52;
const HEX_PREFIX = 13;

export async function computeCrashHundredths(
	serverSeed: string,
	clientSeed: string,
): Promise<number> {
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(serverSeed),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, enc.encode(clientSeed));
	const bytes = new Uint8Array(sig);
	let hex = "";
	for (const b of bytes) hex += b.toString(16).padStart(2, "0");
	const h = Number.parseInt(hex.slice(0, HEX_PREFIX), 16);
	if (h === TWO_POW_52) return 100;
	const numerator = 100 * TWO_POW_52 - h;
	const denominator = TWO_POW_52 - h;
	const multiplier = Math.max(1, Math.floor(numerator / denominator) / 100);
	return Math.floor(multiplier * 100);
}
