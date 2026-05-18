import {
	Counter,
	collectDefaultMetrics,
	register as defaultRegister,
	Histogram,
	Registry,
} from 'prom-client'

type BetStatusLabel = 'placed' | 'won' | 'lost' | 'cancelled'

export class GameMetrics {
	readonly registry: Registry

	private readonly betsTotal: Counter<'status'>
	private readonly betAmountSum: Counter
	private readonly payoutSum: Counter
	private readonly betAmountHist: Histogram
	private readonly wsEmitDuration: Histogram<'event'>
	private readonly outboxLag: Histogram

	constructor(registry?: Registry) {
		this.registry = registry ?? defaultRegister
		if (registry) {
			collectDefaultMetrics({ register: registry })
		}

		this.betsTotal = new Counter({
			name: 'crash_bets_total',
			help: 'Bets observed by terminal status',
			labelNames: ['status'] as const,
			registers: [this.registry],
		})
		this.betAmountSum = new Counter({
			name: 'crash_bet_amount_cents_sum',
			help: 'Total wagered amount in cents (use rate() for stake throughput)',
			registers: [this.registry],
		})
		this.payoutSum = new Counter({
			name: 'crash_payout_cents_sum',
			help: 'Total paid out in cents; RTP = rate(payout) / rate(stake)',
			registers: [this.registry],
		})
		this.betAmountHist = new Histogram({
			name: 'crash_bet_amount_cents',
			help: 'Bet amount distribution in cents',
			buckets: [100, 500, 1_000, 5_000, 10_000, 25_000, 50_000, 100_000],
			registers: [this.registry],
		})
		this.wsEmitDuration = new Histogram({
			name: 'crash_ws_emit_duration_ms',
			help: 'Server-side latency of WebSocket broadcasts',
			labelNames: ['event'] as const,
			buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1_000],
			registers: [this.registry],
		})
		this.outboxLag = new Histogram({
			name: 'crash_outbox_publish_lag_ms',
			help: 'Lag between outbox row insertion and successful publish',
			buckets: [10, 50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000],
			registers: [this.registry],
		})
	}

	recordBetPlaced(amountCents: bigint): void {
		this.betsTotal.inc({ status: 'placed' satisfies BetStatusLabel })
		const cents = Number(amountCents)
		this.betAmountSum.inc(cents)
		this.betAmountHist.observe(cents)
	}

	recordBetWon(payoutCents: bigint): void {
		this.betsTotal.inc({ status: 'won' satisfies BetStatusLabel })
		this.payoutSum.inc(Number(payoutCents))
	}

	recordBetsLost(count: number): void {
		if (count <= 0) return
		this.betsTotal.inc({ status: 'lost' satisfies BetStatusLabel }, count)
	}

	recordBetCancelled(): void {
		this.betsTotal.inc({ status: 'cancelled' satisfies BetStatusLabel })
	}

	observeWsEmit(event: string, durationMs: number): void {
		this.wsEmitDuration.observe({ event }, durationMs)
	}

	timeWsEmit(event: string): () => void {
		const end = this.wsEmitDuration.startTimer({ event })
		return () => {
			end()
		}
	}

	observeOutboxLag(lagMs: number): void {
		this.outboxLag.observe(lagMs)
	}
}

export const GAME_METRICS = Symbol('GAME_METRICS')
