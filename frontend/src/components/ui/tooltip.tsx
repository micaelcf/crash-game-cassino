import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "#/lib/cn";

export function TooltipProvider({ children }: { children: ReactNode }) {
	return <BaseTooltip.Provider delay={150}>{children}</BaseTooltip.Provider>;
}

export function Tooltip({
	label,
	children,
	side = "top",
}: {
	label: ReactNode;
	children: ReactNode;
	side?: "top" | "right" | "bottom" | "left";
}) {
	return (
		<BaseTooltip.Root>
			<BaseTooltip.Trigger render={children as React.ReactElement} />
			<BaseTooltip.Portal>
				<BaseTooltip.Positioner sideOffset={6} side={side}>
					<BaseTooltip.Popup
						className={cn(
							"rounded-control border border-border bg-bg-2 px-2 py-1 text-xs text-fg",
							"origin-(--transform-origin) transition-[transform,scale,opacity] duration-150",
							"data-starting-style:scale-90 data-starting-style:opacity-0 data-ending-style:scale-90 data-ending-style:opacity-0",
						)}>
						{label}
					</BaseTooltip.Popup>
				</BaseTooltip.Positioner>
			</BaseTooltip.Portal>
		</BaseTooltip.Root>
	);
}

export type TooltipRootProps = ComponentProps<typeof BaseTooltip.Root>;
