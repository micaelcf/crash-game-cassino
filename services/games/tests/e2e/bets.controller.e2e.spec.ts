import { BetStatus } from '@domain/bet/bet.entity'
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
import { seedBet, seedRound } from './utils/fixtures'
import {
	type BrokerProbe,
	openBrokerProbe,
	publishEvent,
} from './utils/rabbit-helper'
import { bootstrapTestApp, closeTestApp, type TestApp } from './utils/test-app'
import { truncateAllTables } from './utils/truncate'

const POLL_MS = 50

interface CurrentRoundBody {
	id: string
	status: RoundStatus
	[key: string]: unknown
}

interface BetItem {
	id: string
	status: BetStatus
	[key: string]: unknown
}

const waitForRoundStatus = async (
	app: TestApp['app'],
	status: RoundStatus,
	timeoutMs = 5_000,
): Promise<CurrentRoundBody> => {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		const res = await request(app.getHttpServer()).get('/rounds/current')
		const body = res.body as CurrentRoundBody | undefined
		if (body && body.status === status) return body
		await new Promise((r) => setTimeout(r, POLL_MS))
	}
	throw new Error(`Timed out waiting for round status ${status}`)
}

const pollMyBets = async (
	app: TestApp['app'],
	userId: string,
	predicate: (items: BetItem[]) => boolean,
	timeoutMs = 5_000,
): Promise<BetItem[]> => {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		const res = await request(app.getHttpServer())
			.get('/bets/me')
			.set('x-mock-user-id', userId)
		const items = (res.body as { items?: BetItem[] } | undefined)?.items
		if (items && predicate(items)) return items
		await new Promise((r) => setTimeout(r, POLL_MS))
	}
	throw new Error('Timed out waiting for bet predicate')
}

describe('Bets controller (e2e)', () => {
	let pg: PgHandle
	let rabbit: RabbitHandle
	let testApp: TestApp
	let orm: MikroORM
	let probe: BrokerProbe

	beforeAll(async () => {
		;[pg, rabbit] = await Promise.all([startPostgres(), startRabbit()])
		testApp = await bootstrapTestApp({ pgUrl: pg.url, rabbitUrl: rabbit.url })
		orm = testApp.orm
		probe = await openBrokerProbe(
			rabbit.url,
			'games.e2e.outbound',
			['bet.placed', 'player.won', 'round.crashed'],
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
		await probe.channel.purgeQueue('games.e2e.outbound')
	})

	describe('POST /bet', () => {
		it('rejects unauthenticated requests with 401', async () => {
			await request(testApp.app.getHttpServer())
				.post('/bet')
				.send({ amount: '1000' })
				.expect(401)
		})

		it('rejects non-numeric amount with 400', async () => {
			await request(testApp.app.getHttpServer())
				.post('/bet')
				.set('x-mock-user-id', 'u-1')
				.send({ amount: 'abc' })
				.expect(400)
		})

		it('rejects amount below minimum with 400', async () => {
			await waitForRoundStatus(testApp.app, RoundStatus.BETTING_PHASE)

			await request(testApp.app.getHttpServer())
				.post('/bet')
				.set('x-mock-user-id', 'u-1')
				.send({ amount: '99' })
				.expect(400)
		})

		it('rejects amount above maximum with 400', async () => {
			await waitForRoundStatus(testApp.app, RoundStatus.BETTING_PHASE)

			await request(testApp.app.getHttpServer())
				.post('/bet')
				.set('x-mock-user-id', 'u-1')
				.send({ amount: '100001' })
				.expect(400)
		})

		it('persists a PENDING bet on the happy path', async () => {
			await waitForRoundStatus(testApp.app, RoundStatus.BETTING_PHASE)

			const res = await request(testApp.app.getHttpServer())
				.post('/bet')
				.set('x-mock-user-id', 'u-1')
				.send({ amount: '1000' })
				.expect(201)

			expect(res.body).toMatchObject({
				userId: 'u-1',
				amountCents: '1000',
				status: BetStatus.PENDING,
			})
		})

		it('returns 409 on a duplicate bet by the same user', async () => {
			const round = await seedRound(orm, {
				status: RoundStatus.BETTING_PHASE,
				bettingEndsAt: new Date(Date.now() + 60_000),
			})
			await seedBet(orm, {
				roundId: round.id,
				userId: 'u-dup',
				status: BetStatus.PENDING,
			})

			await request(testApp.app.getHttpServer())
				.post('/bet')
				.set('x-mock-user-id', 'u-dup')
				.send({ amount: '500' })
				.expect(409)
		})

		it('returns 409 when no round is in BETTING_PHASE', async () => {
			await seedRound(orm, {
				status: RoundStatus.FLYING,
				bettingEndsAt: new Date(Date.now() - 1_000),
				flyingStartedAt: new Date(),
			})

			await request(testApp.app.getHttpServer())
				.post('/bet')
				.set('x-mock-user-id', 'u-late')
				.send({ amount: '1000' })
				.expect(409)
		})
	})

	describe('POST /bet/cashout', () => {
		it('returns 401 without auth', async () => {
			await request(testApp.app.getHttpServer())
				.post('/bet/cashout')
				.expect(401)
		})

		it('returns 409 when the user has no active bet', async () => {
			await seedRound(orm, {
				status: RoundStatus.FLYING,
				bettingEndsAt: new Date(Date.now() - 1_000),
				flyingStartedAt: new Date(),
			})

			await request(testApp.app.getHttpServer())
				.post('/bet/cashout')
				.set('x-mock-user-id', 'u-no-bet')
				.expect(409)
		})

		it('returns 409 when the round is not FLYING', async () => {
			const round = await seedRound(orm, {
				status: RoundStatus.BETTING_PHASE,
				bettingEndsAt: new Date(Date.now() + 60_000),
			})
			await seedBet(orm, {
				roundId: round.id,
				userId: 'u-early',
				status: BetStatus.CONFIRMED,
			})

			await request(testApp.app.getHttpServer())
				.post('/bet/cashout')
				.set('x-mock-user-id', 'u-early')
				.expect(409)
		})

		it('settles the bet WON with payout on happy path', async () => {
			await waitForRoundStatus(testApp.app, RoundStatus.BETTING_PHASE)

			const placed = await request(testApp.app.getHttpServer())
				.post('/bet')
				.set('x-mock-user-id', 'u-winner')
				.send({ amount: '1000' })
				.expect(201)

			// Confirm the bet by publishing wallet.debited (the games consumer reacts)
			await publishEvent(probe.channel, 'crash.events', 'wallet.debited', {
				betId: placed.body.id,
			})
			await pollMyBets(testApp.app, 'u-winner', (items) =>
				items.some((b) => b.status === BetStatus.CONFIRMED),
			)

			await waitForRoundStatus(testApp.app, RoundStatus.FLYING, 10_000)

			const res = await request(testApp.app.getHttpServer())
				.post('/bet/cashout')
				.set('x-mock-user-id', 'u-winner')
				.expect(200)

			expect(res.body).toMatchObject({ status: BetStatus.WON })
			expect(res.body.cashoutMultiplierHundredths).toBeGreaterThanOrEqual(100)
			expect(typeof res.body.payoutCents).toBe('string')
			expect(BigInt(res.body.payoutCents)).toBeGreaterThanOrEqual(1000n)
		})
	})

	describe('GET /bets/me', () => {
		it('returns paginated bets for the authenticated player only', async () => {
			const round = await seedRound(orm, { status: RoundStatus.BETTING_PHASE })
			await seedBet(orm, {
				roundId: round.id,
				userId: 'alice',
				amountCents: 500n,
			})
			await seedBet(orm, {
				roundId: round.id,
				userId: 'alice',
				amountCents: 700n,
			})
			await seedBet(orm, {
				roundId: round.id,
				userId: 'bob',
				amountCents: 100n,
			})

			const res = await request(testApp.app.getHttpServer())
				.get('/bets/me')
				.set('x-mock-user-id', 'alice')
				.expect(200)

			expect(res.body.total).toBe(2)
			expect(res.body.items).toHaveLength(2)
			for (const item of res.body.items) {
				expect(item.userId).toBe('alice')
			}
		})

		it('returns 401 without auth', async () => {
			await request(testApp.app.getHttpServer()).get('/bets/me').expect(401)
		})
	})
})
