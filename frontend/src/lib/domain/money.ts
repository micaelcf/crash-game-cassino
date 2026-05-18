import { BET_MAX_CENTS, BET_MIN_CENTS, Cents } from "./types";

export type ParseAmountResult =
	| { ok: true; cents: Cents }
	| { ok: false; reason: ParseAmountErrorReason };

export type ParseAmountErrorReason =
	| "empty"
	| "not-a-number"
	| "too-many-decimals"
	| "out-of-range";

const NUMERIC = /^\d+(?:[.,]\d{0,2})?$/;

export function parseAmountToCents(input: string): ParseAmountResult {
	const trimmed = input.trim();
	if (!trimmed) return { ok: false, reason: "empty" };
	if (!NUMERIC.test(trimmed)) {
		return { ok: false, reason: "not-a-number" };
	}
	const normalized = trimmed.replace(",", ".");
	const [whole, frac = ""] = normalized.split(".");
	if (frac.length > 2) {
		return { ok: false, reason: "too-many-decimals" };
	}
	const padded = `${frac}00`.slice(0, 2);
	const cents = BigInt(`${whole}${padded}`);
	if (cents < BET_MIN_CENTS || cents > BET_MAX_CENTS) {
		return { ok: false, reason: "out-of-range" };
	}
	return { ok: true, cents: Cents(cents) };
}

export function formatCents(cents: Cents | string | null | undefined): string {
	if (cents === null || cents === undefined) return "—";
	const raw = typeof cents === "bigint" ? cents : BigInt(cents);
	const negative = raw < 0n;
	const abs = negative ? -raw : raw;
	const whole = abs / 100n;
	const frac = (abs % 100n).toString().padStart(2, "0");
	return `${negative ? "-" : ""}${whole.toString()}.${frac}`;
}

export function formatMultiplier(
	hundredths: number | null | undefined,
): string {
	if (hundredths === null || hundredths === undefined) return "—";
	return `${(hundredths / 100).toFixed(2)}x`;
}
