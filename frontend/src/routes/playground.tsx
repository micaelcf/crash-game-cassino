import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthStatus } from "#/components/playground/AuthStatus";
import { Notifications } from "#/components/playground/Notifications";
import { PhaseBadge } from "#/components/playground/PhaseBadge";
import { PlaygroundNav } from "#/components/playground/PlaygroundNav";
import { SocketStatus } from "#/components/playground/SocketStatus";
import { useCurrentRound } from "#/queries/rounds";
import { useGameEvents } from "#/realtime/useGameEvents";

export const Route = createFileRoute("/playground")({
	component: PlaygroundLayout,
});

function PlaygroundLayout() {
	useGameEvents();
	const { data: round } = useCurrentRound();

	return (
		<main className="min-h-screen bg-slate-950 text-slate-100">
			<header className="border-slate-800 border-b px-6 py-4">
				<div className="mb-3 flex flex-wrap items-center gap-3">
					<h1 className="font-semibold text-lg">Playground</h1>
					<AuthStatus />
					<SocketStatus />
					<PhaseBadge phase={round?.status} />
				</div>
				<PlaygroundNav />
			</header>
			<div className="mx-auto max-w-5xl px-6 py-6">
				<Outlet />
			</div>
			<Notifications />
		</main>
	);
}
