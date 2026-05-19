import { describe, expect, it } from "vitest";
import { Cents } from "#/lib/domain/types";
import { formatCents, formatMultiplier, parseAmountToCents } from "./money";

describe("parseAmountToCents", () => {
	it("parses integer reais", () => {
		const r = parseAmountToCents("10");
		expect(r).toEqual({ ok: true, cents: Cents(1000n) });
	});

	it("parses two-decimal reais", () => {
		const r = parseAmountToCents("12.34");
		expect(r).toEqual({ ok: true, cents: Cents(1234n) });
	});

	it("accepts comma as decimal separator", () => {
		const r = parseAmountToCents("12,34");
		expect(r).toEqual({ ok: true, cents: Cents(1234n) });
	});

	it("rejects empty", () => {
		expect(parseAmountToCents("")).toEqual({ ok: false, reason: "empty" });
		expect(parseAmountToCents("   ")).toEqual({ ok: false, reason: "empty" });
	});

	it("rejects non-numeric", () => {
		expect(parseAmountToCents("abc")).toEqual({
			ok: false,
			reason: "not-a-number",
		});
	});

	it("rejects more than 2 decimals", () => {
		expect(parseAmountToCents("1.234")).toEqual({
			ok: false,
			reason: "not-a-number",
		});
	});

	it("rejects below min", () => {
		expect(parseAmountToCents("0.50")).toEqual({
			ok: false,
			reason: "out-of-range",
		});
	});

	it("rejects above max", () => {
		expect(parseAmountToCents("1000.01")).toEqual({
			ok: false,
			reason: "out-of-range",
		});
	});

	it("accepts boundary values", () => {
		expect(parseAmountToCents("1.00")).toEqual({
			ok: true,
			cents: Cents(100n),
		});
		expect(parseAmountToCents("1000.00")).toEqual({
			ok: true,
			cents: Cents(100_000n),
		});
	});
});

describe("formatCents", () => {
	it("formats integer cents to two-decimal reais", () => {
		expect(formatCents(Cents(0n))).toBe("0.00");
		expect(formatCents(Cents(1n))).toBe("0.01");
		expect(formatCents(Cents(99n))).toBe("0.99");
		expect(formatCents(Cents(100n))).toBe("1.00");
		expect(formatCents(Cents(1234n))).toBe("12.34");
	});

	it("formats string input", () => {
		expect(formatCents("1234")).toBe("12.34");
	});

	it("handles negatives", () => {
		expect(formatCents(Cents(-100n))).toBe("-1.00");
	});

	it("returns em-dash for null/undefined", () => {
		expect(formatCents(null)).toBe("—");
		expect(formatCents(undefined)).toBe("—");
	});
});

describe("formatMultiplier", () => {
	it("formats hundredths as Nx", () => {
		expect(formatMultiplier(100)).toBe("1.00x");
		expect(formatMultiplier(234)).toBe("2.34x");
		expect(formatMultiplier(10_000)).toBe("100.00x");
	});

	it("returns em-dash for null/undefined", () => {
		expect(formatMultiplier(null)).toBe("—");
		expect(formatMultiplier(undefined)).toBe("—");
	});
});
