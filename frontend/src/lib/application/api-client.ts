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
					} catch {
						return undefined;
					}
				},
			}),
		[getAccessToken, isAuthenticated],
	);
}
