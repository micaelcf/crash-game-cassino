import type { ReactNode } from "react";

export interface SectionProps {
	title: string;
	description?: string;
	actions?: ReactNode;
	children: ReactNode;
}

export function Section({
	title,
	description,
	actions,
	children,
}: SectionProps) {
	return (
		<section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
			<header className="mb-3 flex items-start justify-between gap-4">
				<div>
					<h2 className="text-base font-semibold text-slate-100">{title}</h2>
					{description ? (
						<p className="mt-0.5 text-xs text-slate-400">{description}</p>
					) : null}
				</div>
				{actions ? <div className="flex gap-2">{actions}</div> : null}
			</header>
			<div className="space-y-3 text-sm text-slate-200">{children}</div>
		</section>
	);
}
