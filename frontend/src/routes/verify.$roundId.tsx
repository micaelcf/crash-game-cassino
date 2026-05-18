import {
	ArrowLeftIcon,
	CheckCircleIcon,
	CopyIcon,
	FunctionIcon,
	ShieldCheckIcon,
	WarningIcon,
} from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PlayerHeader } from "#/components/game/PlayerHeader";
import { AppShell } from "#/components/shared/AppShell";
import { Button } from "#/components/ui";
import { useVerifyRound } from "#/lib/application/rounds/queries";
import { computeCrashHundredths, FORMULA_LINES } from "#/lib/domain/formula";
import { formatMultiplier } from "#/lib/domain/money";

export const Route = createFileRoute("/verify/$roundId")({
	component: VerifyPage,
});

function VerifyPage() {
	const { roundId } = Route.useParams();
	const verify = useVerifyRound(roundId);
	const [computed, setComputed] = useState<number | null>(null);
	const [computing, setComputing] = useState(false);
	const [copied, setCopied] = useState(false);

	const onCompute = async () => {
		if (!verify.data) return;
		setComputing(true);
		const result = await computeCrashHundredths(
			verify.data.serverSeed,
			verify.data.clientSeed,
		);
		setComputed(result);
		setComputing(false);
	};

	const onCopy = async () => {
		if (!verify.data) return;
		await navigator.clipboard.writeText(JSON.stringify(verify.data, null, 2));
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	const localMatches =
		computed != null && verify.data
			? computed === verify.data.crashPointHundredths
			: null;

	return (
		<AppShell header={<PlayerHeader />}>
			<section className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 lg:px-6 lg:py-10">
				<Link
					to="/history"
					className="mb-4 inline-flex items-center gap-1 text-xs text-(--color-fg-muted) hover:text-(--color-primary)"
				>
					<ArrowLeftIcon size={12} weight="bold" />
					Back to history
				</Link>

				<header className="mb-6">
					<span className="inline-flex items-center gap-2 rounded-(--radius-pill) bg-(--color-bg-1) px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-(--color-secondary) ring-1 ring-inset ring-(--color-secondary)/30">
						<ShieldCheckIcon size={12} weight="bold" />
						Provably fair
					</span>
					<h1 className="mt-3 text-3xl font-black tracking-tighter text-(--color-fg) lg:text-4xl">
						Round verification
					</h1>
				</header>

				<div className="mb-4 rounded-(--radius-card) bg-(--color-bg-1) p-5 ring-1 ring-inset ring-(--color-border)/60 shadow-(--shadow-card)">
					<header className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-(--color-fg-muted)">
						<FunctionIcon
							size={14}
							weight="duotone"
							className="text-(--color-primary)"
						/>
						How this is computed
					</header>
					<ol className="mt-4 space-y-2">
						{FORMULA_LINES.map((line, idx) => (
							<li key={line} className="flex items-start gap-3">
								<span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-(--color-bg-2) font-mono text-[10px] font-bold tabular-nums text-(--color-fg-dim) ring-1 ring-inset ring-(--color-border)/60">
									{idx + 1}
								</span>
								<code className="block flex-1 overflow-x-auto rounded-(--radius-control) bg-(--color-bg-0) px-3 py-1.5 font-mono text-[12px] leading-relaxed text-(--color-fg) ring-1 ring-inset ring-(--color-border)/40">
									{line}
								</code>
							</li>
						))}
					</ol>
					<p className="mt-4 text-[12px] leading-relaxed text-(--color-fg-muted)">
						House edge 1%, baked into the{" "}
						<code className="text-(--color-primary)">100·2^52</code> numerator.
						Hit “Verify locally” below to run this in your browser and confirm
						the result matches the server.
					</p>
				</div>

				{verify.isPending && (
					<p className="text-(--color-fg-muted)">Loading verification…</p>
				)}
				{verify.error && (
					<div className="flex items-start gap-3 rounded-(--radius-card) bg-(--color-danger)/10 p-5 ring-1 ring-inset ring-(--color-danger)/40">
						<WarningIcon
							size={18}
							weight="duotone"
							className="mt-0.5 text-(--color-danger)"
						/>
						<p className="text-sm text-(--color-danger)">
							{verify.error instanceof Error
								? verify.error.message
								: "Round not verifiable yet."}
						</p>
					</div>
				)}

				{verify.data && (
					<div className="space-y-3 rounded-(--radius-card) bg-(--color-bg-1) p-6 ring-1 ring-inset ring-(--color-border)/60 shadow-(--shadow-card)">
						<Row label="Round ID" value={verify.data.roundId} />
						<Row label="Nonce" value={String(verify.data.nonce)} />
						<Row
							label="Hash commitment"
							value={verify.data.hashCommitment}
							mono
						/>
						<Row
							label="Server seed (revealed)"
							value={verify.data.serverSeed}
							mono
						/>
						<Row label="Client seed" value={verify.data.clientSeed} mono />
						<Row
							label="Crash point"
							value={formatMultiplier(verify.data.crashPointHundredths)}
							highlight
						/>

						<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-(--color-border)/60 pt-4">
							<div className="flex items-center gap-3">
								<Button
									variant="primary"
									size="sm"
									disabled={computing}
									onClick={onCompute}
								>
									<ShieldCheckIcon size={14} weight="bold" />
									{computing ? "Computing…" : "Verify locally"}
								</Button>
								{computed != null && (
									<span
										className={`inline-flex items-center gap-1.5 rounded-(--radius-pill) px-3 py-1 text-[11px] font-bold ${
											localMatches
												? "bg-(--color-secondary)/15 text-(--color-secondary)"
												: "bg-(--color-danger)/15 text-(--color-danger)"
										}`}
									>
										{localMatches ? (
											<CheckCircleIcon size={12} weight="fill" />
										) : (
											<WarningIcon size={12} weight="fill" />
										)}
										{localMatches
											? `Match @ ${formatMultiplier(computed)}`
											: `Mismatch @ ${formatMultiplier(computed)}`}
									</span>
								)}
							</div>
							<Button variant="secondary" size="sm" onClick={onCopy}>
								<CopyIcon size={14} weight="bold" />
								{copied ? "Copied" : "Copy JSON"}
							</Button>
						</div>
					</div>
				)}
			</section>
		</AppShell>
	);
}

function Row({
	label,
	value,
	mono,
	highlight,
}: {
	label: string;
	value: string;
	mono?: boolean;
	highlight?: boolean;
}) {
	return (
		<div className="grid grid-cols-1 gap-1 border-b border-(--color-border)/40 pb-3 last:border-0 sm:grid-cols-[10rem_1fr] sm:gap-3">
			<span className="text-[10px] font-bold uppercase tracking-[0.25em] text-(--color-fg-dim)">
				{label}
			</span>
			<span
				className={[
					"font-mono text-sm",
					mono ? "break-all" : "",
					highlight
						? "text-(--color-primary) font-black text-lg"
						: "text-(--color-fg)",
				].join(" ")}
			>
				{value}
			</span>
		</div>
	);
}
