import { io, type Socket } from "socket.io-client";
import type { TokenGetter } from "#/api/http";

// TODO: when Kong is configured to proxy /socket.io to the games service,
// switch VITE_WS_URL to the Kong origin and drop the direct connection.

export interface CreateSocketOptions {
	url: string;
	getToken?: TokenGetter;
}

export function createGameSocket({
	url,
	getToken,
}: CreateSocketOptions): Socket {
	return io(url, {
		autoConnect: false,
		reconnection: true,
		reconnectionDelay: 1000,
		reconnectionDelayMax: 30_000,
		transports: ["websocket"],
		auth: async (cb) => {
			const token = getToken ? await getToken() : undefined;
			cb(token ? { token } : {});
		},
	});
}
