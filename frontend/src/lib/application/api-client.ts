import { useLogto } from "@logto/react";
import { useEffect } from "react";
import { configureApiClient } from "@crash/api-client";
import { env } from "#/env";

/**
 * Wire the orval-generated client to the Logto session.
 *
 * Mount once near the React root; on every auth change the module-scoped
 * config inside `@crash/api-client` is updated so all generated hooks
 * pick up the fresh bearer-token getter.
 */
export function useConfigureApiClient(): void {
	const { getAccessToken, isAuthenticated } = useLogto();

	useEffect(() => {
		configureApiClient({
			baseUrl: env.VITE_API_BASE_URL,
			getToken: async () => {
				if (!isAuthenticated) return undefined;
				try {
					return await getAccessToken(env.VITE_LOGTO_RESOURCE);
				} catch (err) {
					// Surface Logto's reason — silently swallowing this masks
					// "resource not in token / session expired / JWKS unreachable"
					// failures as opaque 401s downstream.
					console.error("[api-client] getAccessToken failed:", err);
					return undefined;
				}
			},
		});
	}, [getAccessToken, isAuthenticated]);
}
