import { defineConfig } from "orval";

const mutator = {
	path: "./src/mutator/fetch-client.ts",
	name: "fetchClient",
} as const;

const overrideShared = {
	mutator,
	query: {
		useQuery: true,
		useMutation: true,
		signal: true,
	},
	fetch: {
		// Return DTOs directly (no { data, status, headers } envelope).
		// Mutator throws ApiError on non-2xx so consumers + cache writers
		// can treat every successful response as the wire shape verbatim.
		includeHttpResponseReturnType: false,
	},
} as const;

export default defineConfig({
	games: {
		input: { target: "../../services/games/openapi.json" },
		output: {
			mode: "tags-split",
			target: "src/games/endpoints.ts",
			schemas: "src/games/schemas",
			client: "react-query",
			httpClient: "fetch",
			baseUrl: "/games",
			indexFiles: true,
			prettier: false,
			biome: true,
			override: overrideShared,
		},
	},
	wallets: {
		input: { target: "../../services/wallets/openapi.json" },
		output: {
			mode: "tags-split",
			target: "src/wallets/endpoints.ts",
			schemas: "src/wallets/schemas",
			client: "react-query",
			httpClient: "fetch",
			baseUrl: "/wallets",
			indexFiles: true,
			prettier: false,
			biome: true,
			override: overrideShared,
		},
	},
});
