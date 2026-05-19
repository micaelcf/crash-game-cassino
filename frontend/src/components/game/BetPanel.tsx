import { CoinsIcon, LightningIcon, TrendUpIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { Button, NumberField } from "#/components/ui";
import { isApiError } from "#/lib/api/http/client";
import type { BetDto, RoundDto } from "#/lib/api/types";
import { BetStatus, RoundStatus } from "#/lib/api/types";
import { useCurrentUserSub } from "#/lib/application/auth/useCurrentUserSub";
import {
	useCashOutMutation,
	usePlaceBetMutation,
} from "#/lib/application/bets/queries";
import { pushNotification } from "#/lib/application/realtime/notifications";
import {
	formatCents,
	formatMultiplier,
	parseAmountToCents,
} from "#/lib/domain/money";
import { useMultiplierLoop } from "#/lib/domain/multiplier";
import { BET_MAX_CENTS, BET_MIN_CENTS, Cents } from "#/lib/domain/types";

const QUICK = [1, 5, 10, 50, 100];

export interface BetPanelProps {
	round: RoundDto | null;
	clockOffsetMs?: number;
	balanceCents?: bigint | null;
	headerExtra?: React.ReactNode;
}

export function BetPanel({
	round,
	clockOffsetMs = 0,
	balanceCents,
	headerExtra,
}: BetPanelProps) {
	const userSub = useCurrentUserSub();
	const [amount, setAmount] = useState<number>(10);
	const placeBet = usePlaceBetMutation();
	const cashOut = useCashOutMutation();

	const myBet = useMemo<BetDto | null>(() => {
		if (!round || !userSub) return null;
		return round.bets.find((b) => b.userId === userSub) ?? null;
	}, [round, userSub]);

	const phase: RoundStatus | "IDLE" = round?.status ?? "IDLE";
	const isBetting = phase === RoundStatus.BETTING_PHASE;
	const isFlying = phase === RoundStatus.FLYING;
	const hasPending = myBet?.status === BetStatus.CONFIRMED && isFlying;

	const parsed = parseAmountToCents(amount.toFixed(2));
	const canPlace = isBetting && parsed.ok && !myBet && !placeBet.isPending;

	const submit = () => {
		if (!parsed.ok) {
			pushNotification("error", reasonText(parsed.reason));
			return;
		}
		placeBet.mutate(
			{ amountCents: parsed.cents },
			{
				onError: (err) => {
					pushNotification(
						"error",
						isApiError(err) ? err.message : "Failed to place bet",
					);
				},
			},
		);
	};

	const cashout = () =>
		cashOut.mutate(undefined, {
			onError: (err) => {
				pushNotification(
					"error",
					isApiError(err) ? err.message : "Cash out failed",
				);
			},
		});

	if (hasPending) {
		return (
			<LiveCashoutCard
				bet={myBet}
				round={round}
				clockOffsetMs={clockOffsetMs}
				onCashOut={cashout}
				disabled={cashOut.isPending}
			/>
		);
	}

	const clampAmount = (n: number) =>
		Math.max(
			Number(BET_MIN_CENTS) / 100,
			Math.min(Number(BET_MAX_CENTS) / 100, n),
		);

	const balanceMaxBrl =
		balanceCents != null
			? Math.min(Number(BET_MAX_CENTS) / 100, Number(balanceCents) / 100)
			: Number(BET_MAX_CENTS) / 100;

	return (
		<section className="flex flex-col gap-4 rounded-(--radius-card) bg-bg-1 p-5 ring-1 ring-inset ring-border/70 shadow-(--shadow-card)">
			<header className="flex items-center justify-between gap-2">
				<h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-fg-muted">
					<CoinsIcon size={14} weight="duotone" className="text-primary" />
					Place bet
				</h2>
				<div className="flex items-center gap-2">
					{myBet && (
						<span className="rounded-pill bg-bg-2 px-2.5 py-0.5 font-mono text-[10px] text-fg-dim">
							staked {formatCents(Cents(BigInt(myBet.amountCents)))}
						</span>
					)}
					{headerExtra}
				</div>
			</header>

			<NumberField
				value={amount}
				onValueChange={(v) => setAmount(v ?? 0)}
				min={Number(BET_MIN_CENTS) / 100}
				max={Number(BET_MAX_CENTS) / 100}
				step={1}
				format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
				suffix="BRL"
				hint="Range 1.00 – 1000.00"
			/>

			<div className="grid grid-cols-5 gap-1.5">
				{QUICK.map((v) => (
					<button
						key={v}
						type="button"
						onClick={() => setAmount(v)}
						className="rounded-control bg-bg-2 px-0 py-1.5 text-xs font-bold tabular-nums text-fg-muted ring-1 ring-inset ring-transparent transition-colors hover:text-primary hover:ring-primary/40 active:translate-y-[1px]">
						{v}
					</button>
				))}
			</div>

			<div className="grid grid-cols-3 gap-1.5">
				<MultButton
					label="½"
					onClick={() => setAmount(clampAmount(amount / 2))}
				/>
				<MultButton
					label="2×"
					onClick={() => setAmount(clampAmount(amount * 2))}
				/>
				<MultButton label="Max" onClick={() => setAmount(balanceMaxBrl)} />
			</div>

			<Button
				variant="primary"
				size="lg"
				disabled={!canPlace}
				onClick={submit}
				className="w-full">
				<LightningIcon size={16} weight="fill" />
				{placeBet.isPending
					? "Placing…"
					: !isBetting
						? phase === RoundStatus.FLYING
							? "Round in flight"
							: "Waiting for next round"
						: myBet
							? "Bet already placed"
							: `Bet ${amount.toFixed(2)}`}
			</Button>
		</section>
	);
}

function MultButton({
	label,
	onClick,
}: {
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="rounded-control bg-bg-2/60 py-1.5 text-[11px] font-bold uppercase tracking-widest text-fg-muted ring-1 ring-inset ring-border/60 transition-colors hover:text-primary hover:ring-primary/50 active:translate-y-[1px]">
			{label}
		</button>
	);
}

function LiveCashoutCard({
	bet,
	round,
	clockOffsetMs,
	onCashOut,
	disabled,
}: {
	bet: BetDto;
	round: RoundDto;
	clockOffsetMs: number;
	onCashOut: () => void;
	disabled: boolean;
}) {
	const [mult, setMult] = useState(1);

	useMultiplierLoop({
		startTimeMs: round.flyingStartedAt
			? Date.parse(round.flyingStartedAt)
			: null,
		growthRate: round.growthRate ?? null,
		clockOffsetMs,
		running: round.status === RoundStatus.FLYING,
		onFrame: setMult,
	});

	const stake = BigInt(bet.amountCents);
	const payoutCents = (stake * BigInt(Math.floor(mult * 100))) / 100n;

	return (
		<motion.section
			initial={{ scale: 0.96, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			transition={{ type: "spring", stiffness: 220, damping: 18 }}
			className="flex flex-col gap-3 rounded-(--radius-card) bg-bg-1 p-5 ring-2 ring-inset ring-secondary shadow-(--shadow-glow-green)">
			<header className="flex items-baseline justify-between">
				<span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-secondary">
					<TrendUpIcon size={14} weight="bold" />
					Cash out
				</span>
				<span className="font-mono text-xs tabular-nums text-fg-muted">
					{formatMultiplier(Math.floor(mult * 100))}
				</span>
			</header>
			<p className="font-mono text-4xl font-black tabular-nums text-fg">
				{formatCents(Cents(payoutCents))}{" "}
				<span className="text-sm text-fg-dim">BRL</span>
			</p>
			<Button
				variant="success"
				size="lg"
				disabled={disabled}
				onClick={onCashOut}
				className="w-full">
				{disabled
					? "Cashing out…"
					: `Cash out ${formatCents(Cents(payoutCents))}`}
			</Button>
		</motion.section>
	);
}

function reasonText(r: string): string {
	switch (r) {
		case "empty":
			return "Enter an amount";
		case "not-a-number":
			return "Not a valid number";
		case "too-many-decimals":
			return "Max 2 decimals";
		case "out-of-range":
			return "Must be 1.00 – 1000.00";
		default:
			return r;
	}
}
