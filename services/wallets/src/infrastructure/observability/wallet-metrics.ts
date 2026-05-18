import {
	Counter,
	collectDefaultMetrics,
	register as defaultRegister,
	Histogram,
	Registry,
} from 'prom-client'

type WalletOp = 'debit' | 'credit' | 'debit_failed'

export class WalletMetrics {
	readonly registry: Registry

	private readonly operations: Counter<'op'>
	private readonly outboxLag: Histogram

	constructor(registry?: Registry) {
		this.registry = registry ?? defaultRegister
		if (registry) {
			collectDefaultMetrics({ register: registry })
		}

		this.operations = new Counter({
			name: 'crash_wallet_operations_total',
			help: 'Wallet operations grouped by outcome',
			labelNames: ['op'] as const,
			registers: [this.registry],
		})
		this.outboxLag = new Histogram({
			name: 'crash_outbox_publish_lag_ms',
			help: 'Lag between outbox row insertion and successful publish',
			buckets: [10, 50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000],
			registers: [this.registry],
		})
	}

	recordDebit(): void {
		this.operations.inc({ op: 'debit' satisfies WalletOp })
	}

	recordCredit(): void {
		this.operations.inc({ op: 'credit' satisfies WalletOp })
	}

	recordDebitFailed(): void {
		this.operations.inc({ op: 'debit_failed' satisfies WalletOp })
	}

	observeOutboxLag(lagMs: number): void {
		this.outboxLag.observe(lagMs)
	}
}
