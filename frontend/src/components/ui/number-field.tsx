import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { type ComponentProps, useId } from "react";
import { cn } from "#/lib/cn";

export interface NumberFieldProps
	extends Omit<ComponentProps<typeof BaseNumberField.Root>, "children" | "id"> {
	label?: string;
	hint?: string;
	error?: string;
	suffix?: string;
}

export function NumberField({
	label,
	hint,
	error,
	suffix,
	className,
	...rest
}: NumberFieldProps) {
	const inputId = useId();
	return (
		<BaseNumberField.Root
			id={inputId}
			className={cn("flex flex-col gap-1", className)}
			{...rest}>
			{label && (
				<label
					htmlFor={inputId}
					className="text-xs font-medium uppercase tracking-wider text-fg-muted">
					{label}
				</label>
			)}
			<BaseNumberField.Group className="flex items-stretch rounded-control bg-bg-0/85 ring-1 ring-inset ring-border focus-within:ring-2 focus-within:ring-primary">
				<BaseNumberField.Decrement
					className="flex w-10 items-center justify-center text-lg text-fg-muted transition-colors hover:text-primary disabled:opacity-30"
					aria-label="Decrement">
					−
				</BaseNumberField.Decrement>
				<BaseNumberField.Input className="h-11 w-full min-w-0 bg-transparent text-center font-mono text-lg font-bold tabular-nums text-fg outline-none" />
				{suffix && (
					<span className="flex items-center pr-2 font-mono text-[10px] font-bold uppercase tracking-widest text-fg-dim">
						{suffix}
					</span>
				)}
				<BaseNumberField.Increment
					className="flex w-10 items-center justify-center text-lg text-fg-muted transition-colors hover:text-primary disabled:opacity-30"
					aria-label="Increment">
					+
				</BaseNumberField.Increment>
			</BaseNumberField.Group>
			{hint && !error && <p className="text-[11px] text-fg-dim">{hint}</p>}
			{error && <p className="text-[11px] text-danger">{error}</p>}
		</BaseNumberField.Root>
	);
}
