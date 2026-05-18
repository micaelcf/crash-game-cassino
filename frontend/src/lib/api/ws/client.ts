import { io, type Socket } from "socket.io-client";
import type { TokenGetter } from "#/lib/api/http/client";
import type { GameEventMap } from "./events";

type ServerToClientEvents = {
	[K in keyof GameEventMap]: (payload: GameEventMap[K]) => void;
};
type ClientToServerEvents = Record<string, never>;

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface CreateSocketOptions {
	url: string;
	getToken?: TokenGetter | undefined;
}

export function createGameSocket({
	url,
	getToken,
}: CreateSocketOptions): GameSocket {
	// `io(url, opts)` returns `Socket<DefaultEventsMap, DefaultEventsMap>`; cast
	// to `GameSocket` so listeners get payloads typed against `GameEvent`.
	// This is the documented socket.io pattern for typed events.
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
	}) as GameSocket;
}
