import { useSyncExternalStore } from "react";
import type { GameEvent } from "#/lib/api/ws/events";

export type LoggedEvent = GameEvent & { at: number };

const MAX = 50;
let buffer: LoggedEvent[] = [];
const listeners = new Set<() => void>();

function emit(): void {
	for (const l of listeners) l();
}

export function recordEvent(event: GameEvent): void {
	buffer = [{ ...event, at: Date.now() }, ...buffer].slice(0, MAX);
	emit();
}

export function clearEventLog(): void {
	buffer = [];
	emit();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getSnapshot(): LoggedEvent[] {
	return buffer;
}

function getServerSnapshot(): LoggedEvent[] {
	return [];
}

export function useEventLog(): LoggedEvent[] {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
