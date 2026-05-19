import { describe, expect, it } from "vitest";
import { computeCrashHundredths, FORMULA_LINES } from "./formula";

describe("FORMULA_LINES", () => {
	it("documents the four-step HMAC pipeline", () => {
		expect(FORMULA_LINES).toHaveLength(4);
		expect(FORMULA_LINES[0]).toContain("HMAC-SHA256");
		expect(FORMULA_LINES[0]).toContain("serverSeed");
		expect(FORMULA_LINES[0]).toContain("clientSeed");
		// No nonce in the payload — matches backend provably-fair.service.ts.
		expect(FORMULA_LINES[0]).not.toContain("nonce");
	});
});

describe("computeCrashHundredths", () => {
	it("produces a deterministic integer >= 100 for known seeds", async () => {
		const h = await computeCrashHundredths(
			"server-seed-abc",
			"client-seed-xyz",
		);
		expect(Number.isInteger(h)).toBe(true);
		expect(h).toBeGreaterThanOrEqual(100);
	});

	it("returns the same value for the same seed pair", async () => {
		const a = await computeCrashHundredths("s1", "c1");
		const b = await computeCrashHundredths("s1", "c1");
		expect(a).toBe(b);
	});

	it("differs when seeds differ", async () => {
		const a = await computeCrashHundredths("s1", "c1");
		const b = await computeCrashHundredths("s2", "c1");
		expect(a).not.toBe(b);
	});

	it("matches the backend reference algorithm", async () => {
		// Replicate the backend formula in pure JS using Web Crypto and assert
		// our helper returns the same integer for a non-trivial input. This
		// pins the frontend implementation to the spec laid out in
		// services/games/src/domain/round/provably-fair.service.ts.
		const serverSeed = "be4f3a8d1e";
		const clientSeed = "client-seed-1";

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
		const TWO_POW_52 = 2 ** 52;
		const h = Number.parseInt(hex.slice(0, 13), 16);
		const expected =
			h === TWO_POW_52
				? 100
				: Math.floor(
						Math.max(
							1,
							Math.floor((100 * TWO_POW_52 - h) / (TWO_POW_52 - h)) / 100,
						) * 100,
					);

		const actual = await computeCrashHundredths(serverSeed, clientSeed);
		expect(actual).toBe(expected);
	});
});
