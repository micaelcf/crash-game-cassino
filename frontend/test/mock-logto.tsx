import type { IdTokenClaims } from "@logto/react";
import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
} from "react";
import { vi } from "vitest";

export interface MockLogtoValue {
	isAuthenticated: boolean;
	isLoading: boolean;
	error?: Error;
	signIn: (redirectUri: string) => Promise<void> | void;
	signOut: (redirectUri: string) => Promise<void> | void;
	getAccessToken: (resource?: string) => Promise<string | undefined>;
	getIdTokenClaims: () => Promise<IdTokenClaims | undefined>;
}

export interface MockHandleSignInCallback {
	isLoading: boolean;
	error?: Error;
	/** When set, the registered callback fires with no args once on mount. */
	autoComplete?: boolean;
}

const MockLogtoContext = createContext<MockLogtoValue | null>(null);
const MockCallbackContext = createContext<MockHandleSignInCallback | null>(null);

/**
 * Default mock fns. Tests can spy by passing custom signIn/signOut into props.
 */
export function makeDefaultMockLogto(
	overrides: Partial<MockLogtoValue> = {},
): MockLogtoValue {
	return {
		isAuthenticated: false,
		isLoading: false,
		signIn: vi.fn(),
		signOut: vi.fn(),
		getAccessToken: vi.fn(async () => "test-access-token"),
		getIdTokenClaims: vi.fn(async () => ({
			sub: "user-1",
			username: "test-user",
			name: "Test User",
			aud: "test",
			exp: 0,
			iat: 0,
			iss: "test",
		})),
		...overrides,
	};
}

export function MockLogtoProvider({
	value,
	callback,
	children,
}: {
	value: MockLogtoValue;
	callback?: MockHandleSignInCallback;
	children: ReactNode;
}) {
	const memoized = useMemo(() => value, [value]);
	const cb = useMemo(() => callback ?? { isLoading: false }, [callback]);
	return (
		<MockLogtoContext.Provider value={memoized}>
			<MockCallbackContext.Provider value={cb}>
				{children}
			</MockCallbackContext.Provider>
		</MockLogtoContext.Provider>
	);
}

/** Hook the `vi.mock` for `@logto/react` reads to back `useLogto()`. */
export function useMockLogto(): MockLogtoValue {
	const ctx = useContext(MockLogtoContext);
	if (!ctx) {
		throw new Error(
			"useMockLogto called outside <MockLogtoProvider>. Wrap your test render with renderWithProviders().",
		);
	}
	return ctx;
}

export function useMockCallback(): MockHandleSignInCallback {
	const ctx = useContext(MockCallbackContext);
	return ctx ?? { isLoading: false };
}
