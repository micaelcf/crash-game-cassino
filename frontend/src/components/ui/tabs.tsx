import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type { ComponentProps } from "react";
import { cn } from "#/lib/cn";

export function Tabs({
	className,
	...rest
}: ComponentProps<typeof BaseTabs.Root>) {
	return <BaseTabs.Root className={cn(className)} {...rest} />;
}

export function TabsList({
	className,
	...rest
}: ComponentProps<typeof BaseTabs.List>) {
	return (
		<BaseTabs.List
			className={cn(
				"relative z-0 flex gap-1 rounded-(--radius-control) border border-(--color-border) bg-(--color-bg-1) p-1",
				className,
			)}
			{...rest}
		/>
	);
}

export function TabsTab({
	className,
	...rest
}: ComponentProps<typeof BaseTabs.Tab>) {
	return (
		<BaseTabs.Tab
			className={cn(
				"flex h-8 items-center justify-center rounded-(--radius-control) px-3 text-xs font-medium text-(--color-fg-muted) outline-hidden select-none",
				"hover:text-(--color-fg) data-[active]:text-(--color-fg)",
				"focus-visible:outline-2 focus-visible:outline-(--color-neon-cyan)",
				className,
			)}
			{...rest}
		/>
	);
}

export function TabsIndicator({
	className,
	...rest
}: ComponentProps<typeof BaseTabs.Indicator>) {
	return (
		<BaseTabs.Indicator
			className={cn(
				"absolute top-1/2 left-0 z-[-1] h-7 w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] -translate-y-1/2 rounded-(--radius-control) bg-(--color-bg-2) transition-all duration-200 ease-out",
				className,
			)}
			{...rest}
		/>
	);
}

export function TabsPanel({
	className,
	...rest
}: ComponentProps<typeof BaseTabs.Panel>) {
	return (
		<BaseTabs.Panel
			className={cn("focus-visible:outline-hidden", className)}
			{...rest}
		/>
	);
}
