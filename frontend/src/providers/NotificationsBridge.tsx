import { useEffect, useRef } from "react";
import { useToast } from "#/components/ui";
import {
	dismissNotification,
	useNotifications,
} from "#/lib/application/realtime/notifications";

const LEVEL_TO_TONE = {
	info: "info",
	warning: "warning",
	error: "error",
} as const;

export function NotificationsBridge() {
	const notifications = useNotifications();
	const toast = useToast();
	const seen = useRef<Set<string>>(new Set());

	useEffect(() => {
		for (const n of notifications) {
			if (seen.current.has(n.id)) continue;
			seen.current.add(n.id);
			toast.push(LEVEL_TO_TONE[n.level], titleFor(n.level), n.message);
			dismissNotification(n.id);
		}
	}, [notifications, toast]);

	return null;
}

function titleFor(level: "info" | "warning" | "error"): string {
	if (level === "error") return "Error";
	if (level === "warning") return "Heads up";
	return "Notice";
}
