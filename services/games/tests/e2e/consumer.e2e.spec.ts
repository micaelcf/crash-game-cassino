import { randomUUID } from 'node:crypto'
import { Bet, BetStatus } from '@domain/bet/bet.entity'
import { GAMES_TOPOLOGY } from '@infrastructure/messaging/amqp/topology'
import { InboxEvent } from '@infrastructure/messaging/inbox/inbox-event.entity'
import type { MikroORM } from '@mikro-orm/core'
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

const pollUntil = async <T>(
	fn: () => Promise<T | null | undefined>,
	predicate: (v: T) => boolean,
	timeoutMs = 5_000,
): Promise<T> => {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		const value = await fn()
		if (value != null && predicate(value)) return value
		await new Promise((r) => setTimeout(r, 50))
	}
	throw new Error('pollUntil timed out')
}

describe('Games consumer (e2e)', () => {
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
			'games.e2e.consumer-driver',
			[],
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
	})

	const findBet = async (id: string) => orm.em.fork().findOne(Bet, { id })
	const findInbox = async (id: string) =>
		orm.em.fork().findOne(InboxEvent, { id })

	describe('wallet.debited', () => {
		it('confirms a PENDING bet', async () => {
			const round = await seedRound(orm)
			const bet = await seedBet(orm, { roundId: round.id, userId: 'u-1' })

			await publishEvent(probe.channel, 'crash.events', 'wallet.debited', {
				betId: bet.id,
			})

			const updated = await pollUntil(
				() => findBet(bet.id),
				(b) => b.status === BetStatus.CONFIRMED,
			)
			expect(updated.status).toBe(BetStatus.CONFIRMED)
		})

		it('is idempotent on duplicate messageId', async () => {
			const round = await seedRound(orm)
			const bet = await seedBet(orm, { roundId: round.id, userId: 'u-2' })
			const messageId = randomUUID()

			await publishEvent(
				probe.channel,
				'crash.events',
				'wallet.debited',
				{ betId: bet.id },
				messageId,
			)
			await pollUntil(
				() => findBet(bet.id),
				(b) => b.status === BetStatus.CONFIRMED,
			)

			await publishEvent(
				probe.channel,
				'crash.events',
				'wallet.debited',
				{ betId: bet.id },
				messageId,
			)
			await new Promise((r) => setTimeout(r, 300))

			const inbox = await findInbox(messageId)
			expect(inbox).not.toBeNull()
		})

		it('does not change a settled bet (no-op when not PENDING)', async () => {
			const round = await seedRound(orm)
			const bet = await seedBet(orm, {
				roundId: round.id,
				userId: 'u-3',
				status: BetStatus.CONFIRMED,
			})

			await publishEvent(probe.channel, 'crash.events', 'wallet.debited', {
				betId: bet.id,
			})
			// wait for inbox row to confirm processed
			await new Promise((r) => setTimeout(r, 400))

			const final = await findBet(bet.id)
			expect(final?.status).toBe(BetStatus.CONFIRMED)
		})
	})

	describe('wallet.debit_failed', () => {
		it('cancels a PENDING bet with the given reason', async () => {
			const round = await seedRound(orm)
			const bet = await seedBet(orm, { roundId: round.id, userId: 'u-4' })

			await publishEvent(probe.channel, 'crash.events', 'wallet.debit_failed', {
				betId: bet.id,
				reason: 'Insufficient balance',
			})

			const updated = await pollUntil(
				() => findBet(bet.id),
				(b) => b.status === BetStatus.CANCELLED,
			)
			expect(updated.cancellationReason).toBe('Insufficient balance')
		})

		it('is idempotent on duplicate messageId', async () => {
			const round = await seedRound(orm)
			const bet = await seedBet(orm, { roundId: round.id, userId: 'u-5' })
			const messageId = randomUUID()

			await publishEvent(
				probe.channel,
				'crash.events',
				'wallet.debit_failed',
				{ betId: bet.id, reason: 'r' },
				messageId,
			)
			await pollUntil(
				() => findBet(bet.id),
				(b) => b.status === BetStatus.CANCELLED,
			)

			await publishEvent(
				probe.channel,
				'crash.events',
				'wallet.debit_failed',
				{ betId: bet.id, reason: 'r' },
				messageId,
			)
			await new Promise((r) => setTimeout(r, 300))

			const final = await findBet(bet.id)
			expect(final?.cancellationReason).toBe('r')
		})
	})
})
