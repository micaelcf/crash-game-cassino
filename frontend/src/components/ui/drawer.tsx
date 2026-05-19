import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "#/lib/cn";

type Side = "right" | "left" | "bottom";

const POPUP_BASE =
	"fixed z-30 flex flex-col bg-bg-1 text-fg shadow-(--shadow-card) ring-1 ring-inset ring-border/70 transition-transform duration-200 ease-out";

const POPUP_SIDE: Record<Side, string> = {
	right:
		"top-0 right-0 h-[100dvh] w-[min(22rem,calc(100vw-2rem))] data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
	left: "top-0 left-0 h-[100dvh] w-[min(22rem,calc(100vw-2rem))] data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
	bottom:
		"inset-x-0 bottom-0 max-h-[80dvh] w-full rounded-t-(--radius-card) data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
};

export interface DrawerProps {
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	side?: Side;
	trigger?: ReactNode;
	title?: ReactNode;
	description?: ReactNode;
	children: ReactNode;
	className?: string;
}

export function Drawer({
	open,
	defaultOpen,
	onOpenChange,
	side = "right",
	trigger,
	title,
	description,
	children,
	className,
}: DrawerProps) {
	return (
		<BaseDialog.Root
			open={open}
			defaultOpen={defaultOpen}
			onOpenChange={onOpenChange}>
			{trigger ? (
				<BaseDialog.Trigger render={trigger as React.ReactElement} />
			) : null}
			<BaseDialog.Portal>
				<BaseDialog.Backdrop className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
				<BaseDialog.Popup
					className={cn(POPUP_BASE, POPUP_SIDE[side], className)}>
					{title || description ? (
						<header className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
							<div className="min-w-0">
								{title ? (
									<BaseDialog.Title className="text-sm font-bold uppercase tracking-[0.2em] text-fg">
										{title}
									</BaseDialog.Title>
								) : null}
								{description ? (
									<BaseDialog.Description className="mt-0.5 text-xs text-fg-muted">
										{description}
									</BaseDialog.Description>
								) : null}
							</div>
							<BaseDialog.Close
								aria-label="Close"
								className="inline-flex size-8 shrink-0 items-center justify-center rounded-control bg-bg-2 text-fg-muted ring-1 ring-inset ring-border hover:text-fg">
								<CloseGlyph />
							</BaseDialog.Close>
						</header>
					) : null}
					<div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
				</BaseDialog.Popup>
			</BaseDialog.Portal>
		</BaseDialog.Root>
	);
}

function CloseGlyph() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 14 14"
			fill="none"
			aria-hidden="true">
			<title>Close</title>
			<path
				d="M2 2l10 10M12 2L2 12"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
			/>
		</svg>
	);
}

export type DrawerRootProps = ComponentProps<typeof BaseDialog.Root>;
