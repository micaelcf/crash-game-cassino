import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "#/lib/cn";

export interface ScrollAreaProps
	extends ComponentProps<typeof BaseScrollArea.Root> {
	children: ReactNode;
	/** Pass-through className for the outer Root. */
	className?: string;
	/** className applied to the Viewport (the actual scroll container). */
	viewportClassName?: string;
	/** Which scrollbars to render. Default: both axes. */
	orientation?: "vertical" | "horizontal" | "both";
}

export function ScrollArea({
	children,
	className,
	viewportClassName,
	orientation = "both",
	...rest
}: ScrollAreaProps) {
	const showY = orientation === "vertical" || orientation === "both";
	const showX = orientation === "horizontal" || orientation === "both";

	return (
		<BaseScrollArea.Root
			{...rest}
			className={cn("relative overflow-hidden", className)}>
			<BaseScrollArea.Viewport
				className={cn("h-full w-full overscroll-contain", viewportClassName)}>
				<BaseScrollArea.Content>{children}</BaseScrollArea.Content>
			</BaseScrollArea.Viewport>

			{showY && (
				<BaseScrollArea.Scrollbar
					orientation="vertical"
					className="m-0.5 flex w-1.5 justify-center rounded-full opacity-0 transition-opacity duration-200 data-[hovering]:opacity-100 data-[scrolling]:opacity-100">
					<BaseScrollArea.Thumb className="w-full rounded-full bg-fg-dim/60 transition-colors hover:bg-fg-muted" />
				</BaseScrollArea.Scrollbar>
			)}

			{showX && (
				<BaseScrollArea.Scrollbar
					orientation="horizontal"
					className="m-0.5 flex h-1.5 items-center rounded-full opacity-0 transition-opacity duration-200 data-[hovering]:opacity-100 data-[scrolling]:opacity-100">
					<BaseScrollArea.Thumb className="h-full rounded-full bg-fg-dim/60 transition-colors hover:bg-fg-muted" />
				</BaseScrollArea.Scrollbar>
			)}

			{showX && showY && <BaseScrollArea.Corner />}
		</BaseScrollArea.Root>
	);
}
