import { Toast } from "@base-ui/react/toast";
import type { ReactNode } from "react";
import { cn } from "#/lib/cn";

const TONE_BAR: Record<string, string> = {
	info: "bg-(--color-neon-cyan)",
	success: "bg-(--color-neon-green)",
	warning: "bg-(--color-neon-amber)",
	error: "bg-(--color-danger)",
};

export function ToastProvider({ children }: { children: ReactNode }) {
	return (
		<Toast.Provider>
			{children}
			<Toast.Portal>
				<Toast.Viewport className="fixed top-4 right-4 z-50 flex w-[320px] flex-col">
					<ToastList />
				</Toast.Viewport>
			</Toast.Portal>
		</Toast.Provider>
	);
}

function ToastList() {
	const { toasts } = Toast.useToastManager();
	return toasts.map((toast) => {
		const tone = (toast.type as keyof typeof TONE_BAR) ?? "info";
		return (
			<Toast.Root
				key={toast.id}
				toast={toast}
				className={cn(
					"absolute top-0 right-0 z-[calc(1000-var(--toast-index))] mr-0 w-full origin-top rounded-(--radius-card) border border-(--color-border) bg-(--color-bg-1) p-4 shadow-2xl select-none",
					"[--gap:0.6rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*+1+calc(var(--toast-index)*var(--gap)*+1)+var(--toast-swipe-movement-y))]",
					"[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+(var(--toast-index)*var(--gap))-(var(--shrink)*var(--height))))_scale(var(--scale))]",
					"data-[expanded]:[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--offset-y)))]",
					"data-[starting-style]:[transform:translateY(-150%)] data-[ending-style]:opacity-0",
					"h-[var(--height)] data-[expanded]:h-[var(--toast-height)]",
					"[transition:transform_0.5s_cubic-bezier(0.22,1,0.36,1),opacity_0.4s,height_0.18s]",
				)}
			>
				<div className="flex items-start gap-3">
					<span
						className={cn("mt-1 size-2 shrink-0 rounded-full", TONE_BAR[tone])}
					/>
					<div className="min-w-0 flex-1">
						<Toast.Title className="text-sm font-semibold text-(--color-fg)" />
						<Toast.Description className="mt-0.5 text-xs leading-snug text-(--color-fg-muted)" />
					</div>
					<Toast.Close
						aria-label="Close"
						className="flex size-5 items-center justify-center rounded-sm text-(--color-fg-dim) hover:bg-(--color-bg-2) hover:text-(--color-fg)"
					>
						<svg
							viewBox="0 0 24 24"
							className="size-3"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							role="img"
							aria-label="Close icon"
						>
							<title>Close</title>
							<path d="M18 6 6 18" />
							<path d="m6 6 12 12" />
						</svg>
					</Toast.Close>
				</div>
			</Toast.Root>
		);
	});
}

export type ToastTone = keyof typeof TONE_BAR;

export function useToast() {
	const manager = Toast.useToastManager();
	return {
		push(tone: ToastTone, title: string, description?: string) {
			manager.add({ title, description, type: tone });
		},
	};
}
