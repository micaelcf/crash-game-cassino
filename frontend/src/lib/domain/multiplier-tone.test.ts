import { describe, expect, it } from "vitest";
import {
	TONE_BG_SOFT,
	TONE_RING,
	TONE_TEXT,
	TONE_VAR,
	type Tone,
	toneForHundredths,
} from "./multiplier-tone";

describe("toneForHundredths", () => {
	it.each<[number, Tone]>([
		[0, "danger"],
		[99, "danger"],
		[149, "danger"],
		[150, "cyan"],
		[199, "cyan"],
		[200, "orange"],
		[499, "orange"],
		[500, "green"],
		[999, "green"],
		[1000, "pink"],
		[10_000, "pink"],
	])("classifies %d → %s", (h, expected) => {
		expect(toneForHundredths(h)).toBe(expected);
	});
});

describe("tone class maps", () => {
	const tones: Tone[] = ["danger", "cyan", "orange", "green", "pink"];

	it("exposes a text class for every tone", () => {
		for (const t of tones) {
			expect(TONE_TEXT[t]).toMatch(/^text-/);
		}
	});

	it("exposes a soft bg class for every tone", () => {
		for (const t of tones) {
			expect(TONE_BG_SOFT[t]).toMatch(/^bg-.+\/15$/);
		}
	});

	it("exposes a ring class for every tone", () => {
		for (const t of tones) {
			expect(TONE_RING[t]).toContain("ring-inset");
		}
	});

	it("exposes a CSS-var name for every tone", () => {
		for (const t of tones) {
			expect(TONE_VAR[t]).toMatch(/^--color-/);
		}
	});
});
