import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import {
	MockLogtoProvider,
	makeDefaultMockLogto,
} from "../../../test/mock-logto";
import { server } from "../../../test/msw/server";
import { useApiClient } from "./api-client";

const API = "http://api.test.local";

function harness(authed: boolean, getAccessToken?: () => Promise<string>) {
	const logto = makeDefaultMockLogto({
		isAuthenticated: authed,
		getAccessToken: getAccessToken
			? vi.fn(getAccessToken)
			: makeDefaultMockLogto().getAccessToken,
	});
	function Wrapper({ children }: { children: React.ReactNode }) {
		return <MockLogtoProvider value={logto}>{children}</MockLogtoProvider>;
	}
	return { logto, Wrapper };
}

describe("useApiClient", () => {
	it("omits Authorization header when not authenticated", async () => {
		let receivedAuth: string | null = null;
		server.use(
			http.get(`${API}/wallets/me`, ({ request }) => {
				receivedAuth = request.headers.get("Authorization");
				return HttpResponse.json({ id: "w", playerId: "u", balance: "0" });
			}),
		);
		const { Wrapper } = harness(false);
		const { result } = renderHook(() => useApiClient(), { wrapper: Wrapper });
		await result.current.get("/wallets/me");
		expect(receivedAuth).toBeNull();
	});

	it("attaches Bearer token when authenticated", async () => {
		let receivedAuth: string | null = null;
		server.use(
			http.get(`${API}/wallets/me`, ({ request }) => {
				receivedAuth = request.headers.get("Authorization");
				return HttpResponse.json({ id: "w", playerId: "u", balance: "0" });
			}),
		);
		const { Wrapper, logto } = harness(true, async () => "jwt-token-xyz");
		const { result } = renderHook(() => useApiClient(), { wrapper: Wrapper });
		await result.current.get("/wallets/me");
		await waitFor(() => expect(receivedAuth).toBe("Bearer jwt-token-xyz"));
		expect(logto.getAccessToken).toHaveBeenCalled();
	});

	it("swallows getAccessToken errors and sends without Authorization", async () => {
		let receivedAuth: string | null = null;
		server.use(
			http.get(`${API}/wallets/me`, ({ request }) => {
				receivedAuth = request.headers.get("Authorization");
				return HttpResponse.json({ id: "w", playerId: "u", balance: "0" });
			}),
		);
		const { Wrapper } = harness(true, async () => {
			throw new Error("session expired");
		});
		const { result } = renderHook(() => useApiClient(), { wrapper: Wrapper });
		await result.current.get("/wallets/me");
		expect(receivedAuth).toBeNull();
	});
});
