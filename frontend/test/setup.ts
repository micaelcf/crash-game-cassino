import "@testing-library/jest-dom/vitest";
import { configureApiClient } from "@crash/api-client";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./msw/server";

// Wire the orval mutator against the MSW base URL so every test —
// including unit tests that render hooks without `<ApiClientBridge />`
// — produces fully-qualified requests MSW can intercept.
configureApiClient({
	baseUrl: "http://api.test.local",
	getToken: () => "test-token",
});

vi.mock("#/env", () => ({
	env: {
		VITE_LOGTO_ENDPOINT: "http://localhost:8080/",
		VITE_LOGTO_APP_ID: "test-app-id",
		VITE_LOGTO_RESOURCE: "http://api.test.local",
		VITE_API_BASE_URL: "http://api.test.local",
		VITE_WS_URL: "http://ws.test.local",
	},
}));

vi.mock("@logto/react", async () => {
	const React = await import("react");
	const mod = await import("./mock-logto");
	return {
		useLogto: () => mod.useMockLogto(),
		useHandleSignInCallback: (cb?: () => void) => {
			const state = mod.useMockCallback();
			React.useEffect(() => {
				if (state.autoComplete && !state.error && cb) cb();
			}, [state.autoComplete, state.error, cb]);
			return { isLoading: state.isLoading, error: state.error };
		},
		LogtoProvider: ({ children }: { children: React.ReactNode }) => children,
	};
});

vi.mock("#/providers/SocketProvider", async () => {
	const React = await import("react");
	const ctx = React.createContext({ socket: null, status: "connected" });
	return {
		SocketProvider: ({ children }: { children: React.ReactNode }) => children,
		useSocket: () => React.useContext(ctx),
	};
});

vi.mock("#/lib/application/realtime/useGameEvents", () => ({
	useGameEvents: () => {},
}));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
	cleanup();
	server.resetHandlers();
});

afterAll(() => server.close());

if (typeof window !== "undefined" && !window.matchMedia) {
	window.matchMedia = (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	});
}
