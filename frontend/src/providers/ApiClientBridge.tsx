import { useConfigureApiClient } from "#/lib/application/api-client";

/**
 * Headless component that keeps the orval `fetchClient` module config in
 * sync with the Logto session. Mount once inside `<AuthProvider>`.
 */
export function ApiClientBridge(): null {
	useConfigureApiClient();
	return null;
}
