import { useSyncExternalStore } from "react";

export type NotificationLevel = "info" | "warning" | "error";

export interface Notification {
	id: string;
	level: NotificationLevel;
	message: string;
	at: number;
}

const MAX = 10;
let buffer: Notification[] = [];
const listeners = new Set<() => void>();

function emit(): void {
	for (const l of listeners) l();
}

export function pushNotification(
	level: NotificationLevel,
	message: string,
): void {
	const n: Notification = {
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		level,
		message,
		at: Date.now(),
	};
	buffer = [n, ...buffer].slice(0, MAX);
	emit();
}

export function dismissNotification(id: string): void {
	buffer = buffer.filter((n) => n.id !== id);
	emit();
}

export function clearNotifications(): void {
	buffer = [];
	emit();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getSnapshot(): Notification[] {
	return buffer;
}

function getServerSnapshot(): Notification[] {
	return [];
}

export function useNotifications(): Notification[] {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
