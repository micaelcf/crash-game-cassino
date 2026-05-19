import {
	dismissNotification,
	useNotifications,
} from "#/lib/application/realtime/notifications";

const TONE = {
	info: "border-sky-500 bg-sky-500/10 text-sky-100",
	warning: "border-amber-500 bg-amber-500/10 text-amber-100",
	error: "border-rose-500 bg-rose-500/10 text-rose-100",
} as const;

export function Notifications() {
	const items = useNotifications();
	if (items.length === 0) return null;

	return (
		<div className="pointer-events-none fixed top-4 right-4 z-50 flex w-80 flex-col gap-2">
			{items.map((n) => (
				<div
					key={n.id}
					className={`pointer-events-auto rounded-md border px-3 py-2 text-xs shadow-lg ${TONE[n.level]}`}>
					<div className="flex items-start justify-between gap-2">
						<span className="font-medium uppercase tracking-wide opacity-70">
							{n.level}
						</span>
						<button
							type="button"
							onClick={() => dismissNotification(n.id)}
							className="opacity-60 hover:opacity-100"
							aria-label="Dismiss">
							✕
						</button>
					</div>
					<p className="mt-1 leading-snug">{n.message}</p>
				</div>
			))}
		</div>
	);
}
