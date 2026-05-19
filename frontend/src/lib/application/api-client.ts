import { useLogto } from "@logto/react";
import { useMemo } from "react";
import { env } from "#/env";
import { type ApiClient, createApiClient } from "#/lib/api/http/client";

export function useApiClient(): ApiClient {
	const { getAccessToken, isAuthenticated } = useLogto();

	return useMemo(
		() =>
			createApiClient({
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
			}),
		[getAccessToken, isAuthenticated],
	);
}
