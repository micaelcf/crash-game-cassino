import { isApiError } from "#/lib/api/http/client";
import { useCashOutMutation } from "#/lib/application/bets/queries";

export function CashOutButton({ disabled }: { disabled: boolean }) {
	const mutation = useCashOutMutation();
	const error = isApiError(mutation.error) ? mutation.error : null;

	return (
		<div className="space-y-1">
			<button
				type="button"
				onClick={() => mutation.mutate()}
				disabled={disabled || mutation.isPending}
				className="rounded-md bg-amber-400 px-3 py-1.5 text-sm font-semibold text-slate-950 disabled:bg-slate-700 disabled:text-slate-400">
				{mutation.isPending ? "Cashing out…" : "Cash out"}
			</button>
			{error ? <p className="text-rose-400 text-xs">{error.message}</p> : null}
		</div>
	);
}
