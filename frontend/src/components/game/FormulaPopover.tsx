import { Popover } from "@base-ui/react/popover";
import { ArrowRightIcon, InfoIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import {
	CURVE_DESCRIPTION,
	CURVE_FORMULA,
	FAIRNESS_DESCRIPTION,
} from "#/lib/domain/formula";

export interface FormulaPopoverProps {
	growthRate: number | null | undefined;
	roundId?: string;
}

export function FormulaPopover({ growthRate, roundId }: FormulaPopoverProps) {
	return (
		<Popover.Root>
			<Popover.Trigger
				render={(props) => (
					<button
						type="button"
						aria-label="Show curve formula"
						{...props}
						className="inline-flex size-7 items-center justify-center rounded-full bg-bg-2/70 text-fg-muted ring-1 ring-inset ring-border transition-colors hover:text-primary hover:ring-primary/50 data-[popup-open]:bg-primary/15 data-[popup-open]:text-primary">
						<InfoIcon size={14} weight="duotone" />
					</button>
				)}
			/>
			<Popover.Portal>
				<Popover.Positioner sideOffset={8} align="start">
					<Popover.Popup className="z-30 w-80 origin-[var(--transform-origin)] rounded-(--radius-card) bg-bg-1 p-4 text-sm text-fg shadow-(--shadow-card) outline-1 outline-border data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 transition-[transform,opacity] duration-150">
						<Popover.Title className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-fg-muted">
							<InfoIcon size={12} weight="duotone" className="text-primary" />
							Curve formula
						</Popover.Title>

						<div className="mt-3 space-y-3">
							<div className="rounded-control bg-bg-0/85 p-3 ring-1 ring-inset ring-border/60">
								<code className="block font-mono text-base font-bold text-primary">
									{CURVE_FORMULA}
								</code>
								<p className="mt-2 font-mono text-[11px] text-fg-muted">
									r ={" "}
									<span className="font-bold text-fg">
										{growthRate != null ? growthRate.toFixed(4) : "—"}
									</span>{" "}
									<span className="text-fg-dim">per second</span>
								</p>
							</div>
							<p className="text-[12px] leading-relaxed text-fg-muted">
								{CURVE_DESCRIPTION}
							</p>
							<p className="text-[12px] leading-relaxed text-fg-muted">
								{FAIRNESS_DESCRIPTION}
							</p>
							{roundId && (
								<Link
									to="/verify/$roundId"
									params={{ roundId }}
									className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary hover:underline">
									Verify current round
									<ArrowRightIcon size={11} weight="bold" />
								</Link>
							)}
						</div>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
