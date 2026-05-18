import type { ReactNode } from "react";
import { cn } from "#/lib/cn";

export interface AppShellProps {
	header?: ReactNode;
	children: ReactNode;
	className?: string;
}

export function AppShell({ header, children, className }: AppShellProps) {
	return (
		<main
			className={cn(
				"flex min-h-[100dvh] flex-col text-(--color-fg)",
				className,
			)}
		>
			{header}
			{children}
		</main>
	);
}
