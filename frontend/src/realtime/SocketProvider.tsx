import { useLogto } from "@logto/react";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Socket } from "socket.io-client";
import { env } from "#/env";
import { createGameSocket } from "./socket";

export type SocketStatus = "idle" | "connecting" | "connected" | "disconnected";

interface SocketContextValue {
	socket: Socket | null;
	status: SocketStatus;
}

const SocketContext = createContext<SocketContextValue>({
	socket: null,
	status: "idle",
});

export function SocketProvider({ children }: { children: ReactNode }) {
	const { getAccessToken, isAuthenticated } = useLogto();
	const [status, setStatus] = useState<SocketStatus>("idle");

	const tokenFnRef = useRef<() => Promise<string | undefined>>(
		async () => undefined,
	);
	tokenFnRef.current = async () => {
		if (!isAuthenticated) return undefined;
		try {
			return await getAccessToken(env.VITE_LOGTO_RESOURCE);
		} catch {
			return undefined;
		}
	};

	const [socket] = useState<Socket | null>(() => {
		if (typeof window === "undefined") return null;
		return createGameSocket({
			url: env.VITE_WS_URL,
			getToken: () => tokenFnRef.current(),
		});
	});

	useEffect(() => {
		if (!socket) return;

		const onConnecting = () => setStatus("connecting");
		const onConnect = () => setStatus("connected");
		const onDisconnect = () => setStatus("disconnected");
		const onError = () => setStatus("disconnected");

		socket.on("connect", onConnect);
		socket.on("disconnect", onDisconnect);
		socket.on("connect_error", onError);
		socket.io.on("reconnect_attempt", onConnecting);

		setStatus("connecting");
		socket.connect();

		return () => {
			socket.off("connect", onConnect);
			socket.off("disconnect", onDisconnect);
			socket.off("connect_error", onError);
			socket.io.off("reconnect_attempt", onConnecting);
			socket.disconnect();
		};
	}, [socket]);

	const value = useMemo(() => ({ socket, status }), [socket, status]);

	return (
		<SocketContext.Provider value={value}>{children}</SocketContext.Provider>
	);
}

export function useSocket(): SocketContextValue {
	return useContext(SocketContext);
}
