import { Registry } from 'prom-client'
import { beforeEach, describe, expect, it } from 'vitest'
import { WalletMetrics } from './wallet-metrics'

describe('WalletMetrics', () => {
	let registry: Registry
	let metrics: WalletMetrics

	beforeEach(() => {
		registry = new Registry()
		metrics = new WalletMetrics(registry)
	})

	const valueAt = async (name: string, labels: Record<string, string> = {}) => {
		const m = await registry.getSingleMetric(name)?.get()
		const keys = Object.keys(labels)
		return m?.values.find((v) => {
			if (!keys.length) return true
			return keys.every(
				(k) => (v.labels as Record<string, string>)[k] === labels[k],
			)
		})?.value
	}

	it('records debit, credit, and debit_failed counts under crash_wallet_operations_total', async () => {
		metrics.recordDebit()
		metrics.recordDebit()
		metrics.recordCredit()
		metrics.recordDebitFailed()

		expect(
			await valueAt('crash_wallet_operations_total', { op: 'debit' }),
		).toBe(2)
		expect(
			await valueAt('crash_wallet_operations_total', { op: 'credit' }),
		).toBe(1)
		expect(
			await valueAt('crash_wallet_operations_total', { op: 'debit_failed' }),
		).toBe(1)
	})

	it('observes outbox publish lag in milliseconds', async () => {
		metrics.observeOutboxLag(120)
		const hist = await registry
			.getSingleMetric('crash_outbox_publish_lag_ms')
			?.get()
		const sum = hist?.values.find(
			(v) =>
				(v as { metricName?: string }).metricName ===
				'crash_outbox_publish_lag_ms_sum',
		)
		expect(sum?.value).toBe(120)
	})
})
