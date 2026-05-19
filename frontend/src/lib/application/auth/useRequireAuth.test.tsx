import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
	MockLogtoProvider,
	type MockLogtoValue,
	makeDefaultMockLogto,
} from "../../../../test/mock-logto";
import { useRequireAuth } from "./useRequireAuth";

const navigateSpy = vi.fn();
vi.mock("@tanstack/react-router", async () => {
	const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
		"@tanstack/react-router",
	);
	return {
		...actual,
		useNavigate: () => navigateSpy,
	};
});

function setup(initial: Partial<MockLogtoValue>) {
	let setter: ((next: Partial<MockLogtoValue>) => void) | null = null;

	function Harness({ children }: { children: React.ReactNode }) {
		const [value, setValue] = useState<MockLogtoValue>(() =>
			makeDefaultMockLogto(initial),
		);
		setter = (next) => setValue((prev) => ({ ...prev, ...next }));
		return <MockLogtoProvider value={value}>{children}</MockLogtoProvider>;
	}

	const view = renderHook(() => useRequireAuth("/login"), {
		wrapper: Harness,
	});

	const update = (next: Partial<MockLogtoValue>) => {
		if (!setter) throw new Error("Harness setter not bound");
		setter(next);
	};

	return { ...view, update };
}

describe("useRequireAuth", () => {
	it("returns isLoading=true while Logto is still loading", () => {
		const { result } = setup({ isLoading: true, isAuthenticated: false });
		expect(result.current.isLoading).toBe(true);
		expect(result.current.isAuthenticated).toBe(false);
	});

	it("latches ready once after first isLoading=false", async () => {
		const { result, update } = setup({
			isLoading: true,
			isAuthenticated: false,
		});
		expect(result.current.isLoading).toBe(true);
		await act(async () => {
			update({ isLoading: false, isAuthenticated: true });
		});
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isAuthenticated).toBe(true);
	});

	it("does NOT re-latch when isLoading flips back true mid-session", async () => {
		// Regression for the infinite-loop bug: Logto's getAccessToken proxy
		// toggles isLoading on every API call. Without the latch, useRequireAuth
		// would flip its returned isLoading too and cause /play to mount/unmount.
		const { result, update } = setup({
			isLoading: true,
			isAuthenticated: false,
		});
		await act(async () => {
			update({ isLoading: false, isAuthenticated: true });
		});
		expect(result.current.isLoading).toBe(false);
		await act(async () => {
			update({ isLoading: true });
		});
		expect(result.current.isLoading).toBe(false);
		await act(async () => {
			update({ isLoading: false });
		});
		expect(result.current.isLoading).toBe(false);
	});

	it("navigates to redirect target when not authenticated after latch", async () => {
		navigateSpy.mockClear();
		const { update } = setup({ isLoading: true, isAuthenticated: false });
		await act(async () => {
			update({ isLoading: false, isAuthenticated: false });
		});
		expect(navigateSpy).toHaveBeenCalledWith({ to: "/login" });
	});

	it("does not navigate while loading", () => {
		navigateSpy.mockClear();
		setup({ isLoading: true, isAuthenticated: false });
		expect(navigateSpy).not.toHaveBeenCalled();
	});
});
