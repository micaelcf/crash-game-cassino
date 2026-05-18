import { Registry } from 'prom-client'
import { beforeEach, describe, expect, it } from 'vitest'
import { GameMetrics } from './game-metrics'

describe('GameMetrics', () => {
	let registry: Registry
	let metrics: GameMetrics

	beforeEach(() => {
		registry = new Registry()
		metrics = new GameMetrics(registry)
	})

	const valueAt = async (name: string, labels: Record<string, string> = {}) => {
		const m = await registry.getSingleMetric(name)?.get()
		if (!m) return undefined
		const labelKeys = Object.keys(labels)
		const match = m.values.find((v) => {
			if (!labelKeys.length) return true
			return labelKeys.every(
				(k) => (v.labels as Record<string, string>)[k] === labels[k],
			)
		})
		return match?.value
	}

	it('records a placed bet: increments status=placed and stake amount counters', async () => {
		metrics.recordBetPlaced(2_500n)
		metrics.recordBetPlaced(7_500n)

		expect(await valueAt('crash_bets_total', { status: 'placed' })).toBe(2)
		expect(await valueAt('crash_bet_amount_cents_sum')).toBe(10_000)
	})

	it('records a won bet: increments status=won and payout amount counter', async () => {
		metrics.recordBetWon(3_400n)

		expect(await valueAt('crash_bets_total', { status: 'won' })).toBe(1)
		expect(await valueAt('crash_payout_cents_sum')).toBe(3_400)
	})

	it('records lost bets in bulk', async () => {
		metrics.recordBetsLost(5)

		expect(await valueAt('crash_bets_total', { status: 'lost' })).toBe(5)
	})

	it('records cancelled bets', async () => {
		metrics.recordBetCancelled()

		expect(await valueAt('crash_bets_total', { status: 'cancelled' })).toBe(1)
	})

	it('observes websocket emit latency labelled by event name', async () => {
		metrics.observeWsEmit('round.crashed', 12)
		const hist = await registry
			.getSingleMetric('crash_ws_emit_duration_ms')
			?.get()
		const count = hist?.values.find(
			(v) =>
				(v as { metricName?: string }).metricName ===
					'crash_ws_emit_duration_ms_count' &&
				(v.labels as { event?: string }).event === 'round.crashed',
		)
		expect(count?.value).toBe(1)
	})

	it('observes outbox publish lag in milliseconds', async () => {
		metrics.observeOutboxLag(150)
		const hist = await registry
			.getSingleMetric('crash_outbox_publish_lag_ms')
			?.get()
		const sum = hist?.values.find(
			(v) =>
				(v as { metricName?: string }).metricName ===
				'crash_outbox_publish_lag_ms_sum',
		)
		expect(sum?.value).toBe(150)
	})

	it('exposes registry text in Prometheus format', async () => {
		metrics.recordBetPlaced(1_000n)
		const text = await registry.metrics()
		expect(text).toContain('crash_bets_total{status="placed"} 1')
	})

	it('times a websocket emit with timeWsEmit() helper', async () => {
		const stop = metrics.timeWsEmit('bet.placed')
		stop()
		const hist = await registry
			.getSingleMetric('crash_ws_emit_duration_ms')
			?.get()
		const count = hist?.values.find(
			(v) =>
				(v as { metricName?: string }).metricName ===
					'crash_ws_emit_duration_ms_count' &&
				(v.labels as { event?: string }).event === 'bet.placed',
		)
		expect(count?.value).toBe(1)
	})
})
