export class ApiError extends Error {
	readonly status: number;
	readonly body: unknown;

	constructor(status: number, body: unknown, message: string) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.body = body;
	}
}

export const isApiError = (value: unknown): value is ApiError =>
	value instanceof ApiError;

export type TokenGetter = () =>
	| Promise<string | undefined>
	| string
	| undefined;

export interface ApiClientConfig {
	/** Absolute base URL pointing at the Kong gateway. */
	baseUrl: string;
	/** Resolves an OAuth bearer token (Logto access token) per-request. */
	getToken?: TokenGetter;
}

let config: ApiClientConfig = { baseUrl: "", getToken: undefined };

/**
 * Set the runtime configuration used by every generated API call.
 * Frontend should invoke this once during app bootstrap (before the
 * first React render) so the bearer token + base URL are available to
 * the orval-emitted hooks.
 */
export const configureApiClient = (next: ApiClientConfig): void => {
	config = next;
};

/**
 * Orval `httpClient: fetch` custom instance.
 *
 * Signature `(url, init) => Promise<{ status, data, headers }>` matches
 * what the generator emits for response-typed fetch endpoints.
 */
export const fetchClient = async <T>(
	url: string,
	init: RequestInit = {},
): Promise<T> => {
	const headers = new Headers(init.headers ?? {});
	const token = config.getToken ? await config.getToken() : undefined;
	if (token && !headers.has("Authorization")) {
		headers.set("Authorization", `Bearer ${token}`);
	}
	if (init.body !== undefined && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}
	if (!headers.has("Accept")) headers.set("Accept", "application/json");

	const absolute = url.startsWith("http")
		? url
		: `${config.baseUrl}${url}`;

	const res = await fetch(absolute, { ...init, headers });
	const text = await res.text();
	const body: unknown = text ? safeParse(text) : null;

	if (!res.ok) {
		const message =
			(isRecord(body) && typeof body.message === "string"
				? body.message
				: undefined) ?? `HTTP ${res.status} ${res.statusText}`;
		throw new ApiError(res.status, body, message);
	}

	// Orval is configured with `includeHttpResponseReturnType: false`,
	// so generated callers expect the raw DTO — not a `{ data, status }`
	// envelope. Return the parsed body verbatim.
	return body as T;
};

const safeParse = (text: string): unknown => {
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

export default fetchClient;
