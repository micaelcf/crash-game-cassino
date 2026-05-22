// Compat barrel — re-exports the shared orval mutator primitives so
// existing call sites (`#/lib/api/http/client`) keep resolving while
// the project transitions to importing directly from
// `@crash/api-client`.

export {
	type ApiClientConfig,
	ApiError,
	configureApiClient,
	isApiError,
	type TokenGetter,
} from "@crash/api-client";
