import { useSocket } from "#/providers/SocketProvider";
import { Pill } from "./AuthStatus";

export function SocketStatus() {
	const { status } = useSocket();
	const tone =
		status === "connected"
			? "emerald"
			: status === "connecting"
				? "amber"
				: status === "disconnected"
					? "rose"
					: "slate";
	return <Pill label={`ws: ${status}`} tone={tone} />;
}
