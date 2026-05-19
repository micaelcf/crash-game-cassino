import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { projectMultiplier, useMultiplierLoop } from "./multiplier";

describe("projectMultiplier", () => {
	it("returns 1 before round start", () => {
		expect(
			projectMultiplier({
				startTimeMs: 1000,
				growthRate: 0.06,
				now: 0,
			}),
		).toBe(1);
	});

	it("computes exp(growth × elapsed)", () => {
		const m = projectMultiplier({
			startTimeMs: 0,
			growthRate: 0.06,
			now: 10_000, // 10s
		});
		// e^(0.06 * 10) = e^0.6 ≈ 1.8221
		expect(m).toBeCloseTo(Math.exp(0.6), 5);
	});

	it("applies clockOffsetMs (client - server)", () => {
		const m = projectMultiplier({
			startTimeMs: 0,
			growthRate: 0.06,
			now: 11_000,
			clockOffsetMs: 1000, // client 1s ahead of server
		});
		// effective elapsed = (11000 - 1000 - 0) / 1000 = 10s
		expect(m).toBeCloseTo(Math.exp(0.6), 5);
	});
});

describe("useMultiplierLoop", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("does not invoke onFrame when running=false", () => {
		const onFrame = vi.fn();
		renderHook(() =>
			useMultiplierLoop({
				startTimeMs: 0,
				growthRate: 0.06,
				running: false,
				onFrame,
			}),
		);
		vi.advanceTimersByTime(100);
		expect(onFrame).not.toHaveBeenCalled();
	});

	it("calls onFrame on each rAF tick when running", async () => {
		const onFrame = vi.fn();
		vi.setSystemTime(0);
		renderHook(() =>
			useMultiplierLoop({
				startTimeMs: 0,
				growthRate: 0.06,
				running: true,
				onFrame,
			}),
		);
		// rAF is ~16ms in jsdom timer mock
		await act(async () => {
			vi.advanceTimersByTime(50);
		});
		expect(onFrame).toHaveBeenCalled();
		const lastMult = onFrame.mock.calls.at(-1)?.[0] as number;
		expect(lastMult).toBeGreaterThanOrEqual(1);
	});

	it("uses latest onFrame ref without re-subscribing", async () => {
		const first = vi.fn();
		const second = vi.fn();
		vi.setSystemTime(0);
		const { rerender } = renderHook(
			({ cb }: { cb: (m: number) => void }) =>
				useMultiplierLoop({
					startTimeMs: 0,
					growthRate: 0.06,
					running: true,
					onFrame: cb,
				}),
			{ initialProps: { cb: first } },
		);
		await act(async () => {
			vi.advanceTimersByTime(50);
		});
		rerender({ cb: second });
		first.mockClear();
		await act(async () => {
			vi.advanceTimersByTime(50);
		});
		expect(second).toHaveBeenCalled();
		expect(first).not.toHaveBeenCalled();
	});
});
