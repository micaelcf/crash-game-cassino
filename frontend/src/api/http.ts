export type TokenGetter = () =>
	| Promise<string | undefined>
	| string
	| undefined;

export interface ApiClientConfig {
	baseUrl: string;
	getToken?: TokenGetter;
}

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

export interface ApiClient {
	get<T>(path: string, init?: RequestInit): Promise<T>;
	post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
}

export function createApiClient({
	baseUrl,
	getToken,
}: ApiClientConfig): ApiClient {
	const request = async <T>(path: string, init: RequestInit): Promise<T> => {
		const token = getToken ? await getToken() : undefined;
		const headers = new Headers(init.headers ?? {});
		if (token) headers.set("Authorization", `Bearer ${token}`);
		if (init.body && !headers.has("Content-Type")) {
			headers.set("Content-Type", "application/json");
		}
		headers.set("Accept", "application/json");

		const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
		const text = await res.text();
		const body: unknown = text ? safeParse(text) : null;

		if (!res.ok) {
			const message =
				(isRecord(body) && typeof body.message === "string"
					? body.message
					: undefined) ?? `HTTP ${res.status} ${res.statusText}`;
			throw new ApiError(res.status, body, message);
		}

		return body as T;
	};

	return {
		get: (path, init = {}) => request(path, { ...init, method: "GET" }),
		post: (path, body, init = {}) =>
			request(path, {
				...init,
				method: "POST",
				body: body === undefined ? undefined : JSON.stringify(body),
			}),
	};
}

function safeParse(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
