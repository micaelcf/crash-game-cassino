import { Bet, BetStatus } from '@domain/bet/bet.entity'
import { RoundStatus } from '@domain/round/round.entity'
import { GAMES_TOPOLOGY } from '@infrastructure/messaging/amqp/topology'
import type { MikroORM } from '@mikro-orm/core'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
	type PgHandle,
	type RabbitHandle,
	startPostgres,
	startRabbit,
	stopContainer,
} from './utils/containers'
import {
	type BrokerProbe,
	openBrokerProbe,
	publishEvent,
	waitForEvent,
} from './utils/rabbit-helper'
import { bootstrapTestApp, closeTestApp, type TestApp } from './utils/test-app'
import { truncateAllTables } from './utils/truncate'

const pollUntil = async <T>(
	fn: () => Promise<T | null | undefined>,
	predicate: (v: T) => boolean,
	timeoutMs = 10_000,
): Promise<T> => {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		const value = await fn()
		if (value != null && predicate(value)) return value
		await new Promise((r) => setTimeout(r, 50))
	}
	throw new Error('pollUntil timed out')
}

const waitForCurrentStatus = async (
	app: TestApp['app'],
	status: RoundStatus,
	timeoutMs = 10_000,
): Promise<Record<string, unknown>> => {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		const res = await request(app.getHttpServer()).get('/rounds/current')
		if (res.body && res.body.status === status) return res.body
		await new Promise((r) => setTimeout(r, 50))
	}
	throw new Error(`Timed out waiting for round status ${status}`)
}

describe('Round orchestrator (e2e)', () => {
	let pg: PgHandle
	let rabbit: RabbitHandle
	let testApp: TestApp
	let orm: MikroORM
	let probe: BrokerProbe
	const PROBE_QUEUE = 'games.e2e.orch'

	beforeAll(async () => {
		;[pg, rabbit] = await Promise.all([startPostgres(), startRabbit()])
		testApp = await bootstrapTestApp({ pgUrl: pg.url, rabbitUrl: rabbit.url })
		orm = testApp.orm
		probe = await openBrokerProbe(
			rabbit.url,
			PROBE_QUEUE,
			['round.crashed', 'wallet.debited'],
			GAMES_TOPOLOGY,
		)
	}, 180_000)

	afterAll(async () => {
		if (probe) await probe.close()
		if (testApp) await closeTestApp(testApp)
		await Promise.all([
			pg ? stopContainer(pg) : Promise.resolve(),
			rabbit ? stopContainer(rabbit) : Promise.resolve(),
		])
	})

	afterEach(async () => {
		await truncateAllTables(orm)
		await probe.channel.purgeQueue(PROBE_QUEUE)
	})

	it('drives a round through BETTING_PHASE → FLYING → CRASHED → next BETTING_PHASE', async () => {
		const first = await waitForCurrentStatus(
			testApp.app,
			RoundStatus.BETTING_PHASE,
		)
		// Phase timing is intentionally tight (BETTING_PHASE_MS=200,
		// INTER_ROUND_GAP_MS=50), so polling /rounds/current for the CRASHED
		// status of a specific round is racy — by the time we observe CRASHED,
		// the next round may already be the one returned. Instead, drive the
		// transition forward, then verify via /rounds/history that the round
		// we started with finished as CRASHED.
		await waitForCurrentStatus(testApp.app, RoundStatus.FLYING)
		await pollUntil(
			async () => {
				const res = await request(testApp.app.getHttpServer())
					.get('/rounds/history')
					.query({ page: 1, pageSize: 20 })
				return res.body
			},
			(body) =>
				Array.isArray(body?.items) &&
				body.items.some(
					(r: { id: string; status: RoundStatus }) =>
						r.id === first.id && r.status === RoundStatus.CRASHED,
				),
		)
		// next round opens after gap
		const deadline = Date.now() + 5_000
		while (Date.now() < deadline) {
			const res = await request(testApp.app.getHttpServer()).get(
				'/rounds/current',
			)
			if (res.body && res.body.id !== first.id) {
				expect([
					RoundStatus.BETTING_PHASE,
					RoundStatus.FLYING,
					RoundStatus.CRASHED,
				]).toContain(res.body.status)
				return
			}
			await new Promise((r) => setTimeout(r, 50))
		}
		throw new Error('next round did not open within deadline')
	})

	it('marks CONFIRMED bets as LOST on crash and publishes round.crashed', async () => {
		const placed = await pollUntil(
			async () => {
				const round = await waitForCurrentStatus(
					testApp.app,
					RoundStatus.BETTING_PHASE,
				)
				const res = await request(testApp.app.getHttpServer())
					.post('/bet')
					.set('x-mock-user-id', 'u-loser')
					.send({ amount: '1000' })
				if (res.status === 201) return { round, bet: res.body }
				return null
			},
			(v) => !!v,
		)

		// confirm bet via wallet.debited
		await publishEvent(probe.channel, 'crash.events', 'wallet.debited', {
			betId: placed.bet.id,
		})
		await pollUntil(
			() => orm.em.fork().findOne(Bet, { id: placed.bet.id }),
			(b) => b.status === BetStatus.CONFIRMED,
		)

		// wait for crash to settle the round (and our bet)
		await waitForCurrentStatus(testApp.app, RoundStatus.CRASHED, 10_000)

		const settled = await pollUntil(
			() => orm.em.fork().findOne(Bet, { id: placed.bet.id }),
			(b) => b.status === BetStatus.LOST,
		)
		expect(settled.payoutCents).toBe(0n)

		// round.crashed event was published
		const event = await waitForEvent(
			probe.channel,
			PROBE_QUEUE,
			(m) =>
				m.routingKey === 'round.crashed' &&
				m.payload.roundId === placed.round.id,
			5_000,
		)
		expect(event.payload).toMatchObject({
			crashPointHundredths: expect.any(Number),
			serverSeed: expect.any(String),
			clientSeed: expect.any(String),
			nonce: expect.any(Number),
		})
	})
})
