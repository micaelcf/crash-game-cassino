import { type FormEvent, useState } from "react";
import type { ApiError } from "#/api/http";
import { parseAmountToCents } from "#/game/money";
import { usePlaceBetMutation } from "#/queries/bets";
import { Field } from "./Field";

export function BetForm({ disabled }: { disabled?: boolean }) {
	const [value, setValue] = useState("10.00");
	const [parseError, setParseError] = useState<string | null>(null);
	const mutation = usePlaceBetMutation();

	const onSubmit = (e: FormEvent) => {
		e.preventDefault();
		setParseError(null);
		const parsed = parseAmountToCents(value);
		if (!parsed.ok) {
			setParseError(reason(parsed.reason));
			return;
		}
		mutation.mutate({ amountCents: parsed.cents });
	};

	const serverError = mutation.error as ApiError | undefined;

	return (
		<form onSubmit={onSubmit} className="space-y-3">
			<Field
				label="Amount (1.00 – 1000.00)"
				hint="Decimal in major units; converted to integer cents on submit."
				error={parseError ?? serverError?.message}
			>
				{({ id }) => (
					<input
						id={id}
						type="text"
						inputMode="decimal"
						value={value}
						onChange={(e) => setValue(e.target.value)}
						disabled={disabled || mutation.isPending}
						className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-slate-100"
					/>
				)}
			</Field>
			<button
				type="submit"
				disabled={disabled || mutation.isPending}
				className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
			>
				{mutation.isPending ? "Placing…" : "Place bet"}
			</button>
		</form>
	);
}

function reason(r: string): string {
	switch (r) {
		case "empty":
			return "Enter an amount.";
		case "not-a-number":
			return "Not a valid number.";
		case "too-many-decimals":
			return "Max 2 decimal places.";
		case "out-of-range":
			return "Must be between 1.00 and 1000.00.";
		default:
			return r;
	}
}
