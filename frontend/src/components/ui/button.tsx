import type { ComponentProps } from "react";
import { cn } from "#/lib/cn";

export type ButtonVariant =
	| "primary"
	| "success"
	| "secondary"
	| "danger"
	| "ghost"
	| "outline";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ComponentProps<"button"> {
	variant?: ButtonVariant;
	size?: ButtonSize;
}

const base =
	"inline-flex items-center justify-center gap-2 font-semibold tracking-tight rounded-control " +
	"transition-[transform,box-shadow,background-color,color,filter] duration-150 ease-out " +
	"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
	"disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0 " +
	"active:translate-y-[1px] select-none whitespace-nowrap";

const VARIANT: Record<ButtonVariant, string> = {
	primary:
		"bg-primary text-bg-0 ring-1 ring-inset ring-white/10 hover:brightness-110 hover:bg-(--color-primary-hot)",
	success:
		"bg-secondary text-bg-0 ring-1 ring-inset ring-white/10 hover:shadow-(--shadow-glow-green) hover:brightness-110",
	secondary:
		"bg-bg-2 text-fg ring-1 ring-inset ring-border hover:bg-bg-1 hover:ring-primary/40",
	danger:
		"bg-danger text-white ring-1 ring-inset ring-white/10 hover:brightness-110",
	ghost: "bg-transparent text-fg-muted hover:bg-bg-2 hover:text-fg",
	outline:
		"bg-transparent text-fg ring-1 ring-inset ring-border hover:ring-primary hover:text-primary",
};

const SIZE: Record<ButtonSize, string> = {
	sm: "h-8 px-3 text-xs",
	md: "h-10 px-4 text-sm",
	lg: "h-12 px-6 text-base",
};

export function Button({
	variant = "primary",
	size = "md",
	className,
	type = "button",
	...rest
}: ButtonProps) {
	return (
		<button
			type={type}
			className={cn(base, VARIANT[variant], SIZE[size], className)}
			{...rest}
		/>
	);
}
