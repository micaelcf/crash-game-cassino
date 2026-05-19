import { act, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
	MockLogtoProvider,
	type MockLogtoValue,
	makeDefaultMockLogto,
} from "../../../../test/mock-logto";
import { useCurrentUserSub } from "./useCurrentUserSub";

function setup(initial: Partial<MockLogtoValue>) {
	let setter: ((next: Partial<MockLogtoValue>) => void) | null = null;

	function Harness({ children }: { children: React.ReactNode }) {
		const [value, setValue] = useState<MockLogtoValue>(() =>
			makeDefaultMockLogto(initial),
		);
		setter = (next) => setValue((prev) => ({ ...prev, ...next }));
		return <MockLogtoProvider value={value}>{children}</MockLogtoProvider>;
	}

	const view = renderHook(() => useCurrentUserSub(), { wrapper: Harness });

	return {
		...view,
		update: (next: Partial<MockLogtoValue>) => {
			if (!setter) throw new Error("Harness setter not bound");
			setter(next);
		},
	};
}

describe("useCurrentUserSub", () => {
	it("returns undefined while unauthenticated", () => {
		const { result } = setup({ isAuthenticated: false });
		expect(result.current).toBeUndefined();
	});

	it("resolves sub from getIdTokenClaims when authenticated", async () => {
		const { result } = setup({
			isAuthenticated: true,
			getIdTokenClaims: vi.fn(async () => ({
				sub: "user-42",
				aud: "",
				exp: 0,
				iat: 0,
				iss: "",
			})),
		});
		await waitFor(() => expect(result.current).toBe("user-42"));
	});

	it("clears sub when isAuthenticated flips false", async () => {
		const { result, update } = setup({
			isAuthenticated: true,
			getIdTokenClaims: vi.fn(async () => ({
				sub: "user-42",
				aud: "",
				exp: 0,
				iat: 0,
				iss: "",
			})),
		});
		await waitFor(() => expect(result.current).toBe("user-42"));
		await act(async () => {
			update({ isAuthenticated: false });
		});
		await waitFor(() => expect(result.current).toBeUndefined());
	});
});
