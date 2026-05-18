import {
	clearEventLog,
	useEventLog,
} from "#/lib/application/realtime/eventLog";

export function EventLog() {
	const events = useEventLog();

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-xs text-slate-400">
					Last {events.length} events
				</span>
				<button
					type="button"
					onClick={clearEventLog}
					className="rounded border border-slate-700 px-2 py-0.5 text-xs hover:bg-slate-800"
				>
					Clear
				</button>
			</div>
			<ol className="max-h-72 space-y-1 overflow-auto rounded-md border border-slate-800 bg-slate-950 p-2 font-mono text-xs">
				{events.length === 0 ? (
					<li className="px-1 py-0.5 text-slate-500">— no events yet —</li>
				) : (
					events.map((e) => (
						<li
							key={`${e.at}-${e.type}`}
							className="border-slate-900 border-b px-1 py-0.5 last:border-b-0"
						>
							<span className="text-slate-500">
								{new Date(e.at).toLocaleTimeString()}
							</span>{" "}
							<span className="text-emerald-300">{e.type}</span>{" "}
							<span className="text-slate-300">
								{JSON.stringify(e.payload)}
							</span>
						</li>
					))
				)}
			</ol>
		</div>
	);
}
