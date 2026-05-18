import { type ReactNode, useId } from "react";

export function Field({
	label,
	hint,
	error,
	children,
}: {
	label: string;
	hint?: string | undefined;
	error?: string | undefined;
	children: (props: { id: string }) => ReactNode;
}) {
	const id = useId();
	return (
		<div className="flex flex-col gap-1 text-xs">
			<label htmlFor={id} className="font-medium text-slate-300">
				{label}
			</label>
			{children({ id })}
			{hint && !error ? <span className="text-slate-500">{hint}</span> : null}
			{error ? <span className="text-rose-400">{error}</span> : null}
		</div>
	);
}
