function replacer(_: string, value: unknown): unknown {
	if (typeof value === "bigint") return value.toString();
	return value;
}

export function JsonView({ value }: { value: unknown }) {
	let text: string;
	try {
		text = JSON.stringify(value, replacer, 2) ?? "undefined";
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		text = `[unserialisable: ${msg}]`;
	}
	return (
		<pre className="max-h-72 overflow-auto rounded-md border border-slate-800 bg-slate-950 p-3 font-mono text-xs leading-snug text-slate-200">
			{text}
		</pre>
	);
}
