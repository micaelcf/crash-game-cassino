import { io, type Socket } from "socket.io-client";
import type { TokenGetter } from "#/api/http";

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
