import { randomUUID } from 'node:crypto'
import { Wallet } from '@domain/wallet/wallet.entity'
import { WALLETS_TOPOLOGY } from '@infrastructure/messaging/amqp/topology'
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
import { seedWallet } from './utils/fixtures'
import {
	type BrokerProbe,
	openBrokerProbe,
	publishEvent,
	waitForEvent,
} from './utils/rabbit-helper'
import { bootstrapTestApp, closeTestApp, type TestApp } from './utils/test-app'
import { truncateAllTables } from './utils/truncate'

const POLL_INTERVAL_MS = 50
const POLL_TIMEOUT_MS = 5_000

const pollUntil = async <T>(
	fn: () => Promise<T | null | undefined>,
	predicate: (v: T) => boolean,
	timeoutMs = POLL_TIMEOUT_MS,
): Promise<T> => {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		const value = await fn()
		if (value != null && predicate(value)) return value
		await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
	}
	throw new Error('pollUntil timed out')
}

describe('Wallets consumer (e2e)', () => {
	let pg: PgHandle
	let rabbit: RabbitHandle
	let testApp: TestApp
	let orm: MikroORM
	let probe: BrokerProbe
	const PROBE_QUEUE = 'wallets.e2e.outbound'

	beforeAll(async () => {
		;[pg, rabbit] = await Promise.all([startPostgres(), startRabbit()])
		testApp = await bootstrapTestApp({ pgUrl: pg.url, rabbitUrl: rabbit.url })
		orm = testApp.orm
		probe = await openBrokerProbe(
			rabbit.url,
			PROBE_QUEUE,
			['wallet.debited', 'wallet.debit_failed'],
			WALLETS_TOPOLOGY,
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

	const fetchWallet = async (playerId: string) => {
		return orm.em.fork().findOne(Wallet, { playerId })
	}

	describe('bet.placed → debit', () => {
		it('debits the wallet and publishes wallet.debited on success', async () => {
			await seedWallet(orm, { playerId: 'player-1', balance: 1000n })

			const messageId = await publishEvent(
				probe.channel,
				'crash.events',
				'bet.placed',
				{
					userId: 'player-1',
					betAmount: '300',
					roundId: 'round-1',
				},
			)

			const event = await waitForEvent(
				probe.channel,
				PROBE_QUEUE,
				(m) =>
					m.routingKey === 'wallet.debited' && m.payload.userId === 'player-1',
			)

			expect(event.payload).toMatchObject({
				userId: 'player-1',
				roundId: 'round-1',
				amount: '300',
			})

			const wallet = await pollUntil(
				() => fetchWallet('player-1'),
				(w) => w.balance === 700n,
			)
			expect(wallet.balance).toBe(700n)
			// inbox row recorded
			const inbox = await orm.em.fork().findOne(InboxEvent, { id: messageId })
			expect(inbox).not.toBeNull()
		})

		it('publishes wallet.debit_failed when balance is insufficient', async () => {
			await seedWallet(orm, { playerId: 'player-2', balance: 100n })

			await publishEvent(probe.channel, 'crash.events', 'bet.placed', {
				userId: 'player-2',
				betAmount: '500',
				roundId: 'round-2',
			})

			const event = await waitForEvent(
				probe.channel,
				PROBE_QUEUE,
				(m) =>
					m.routingKey === 'wallet.debit_failed' &&
					m.payload.userId === 'player-2',
			)

			expect(event.payload.reason).toBe('Insufficient balance')

			const wallet = await fetchWallet('player-2')
			expect(wallet?.balance).toBe(100n)
		})

		it('publishes wallet.debit_failed when the wallet is missing', async () => {
			await publishEvent(probe.channel, 'crash.events', 'bet.placed', {
				userId: 'ghost',
				betAmount: '50',
				roundId: 'round-3',
			})

			const event = await waitForEvent(
				probe.channel,
				PROBE_QUEUE,
				(m) =>
					m.routingKey === 'wallet.debit_failed' &&
					m.payload.userId === 'ghost',
			)

			expect(event.payload.reason).toBe('Wallet not found')
		})

		it('is idempotent on duplicate messageId', async () => {
			await seedWallet(orm, { playerId: 'player-3', balance: 1000n })
			const messageId = randomUUID()

			await publishEvent(
				probe.channel,
				'crash.events',
				'bet.placed',
				{ userId: 'player-3', betAmount: '300', roundId: 'r-1' },
				messageId,
			)

			await waitForEvent(
				probe.channel,
				PROBE_QUEUE,
				(m) => m.routingKey === 'wallet.debited' && m.messageId !== undefined,
			)

			await publishEvent(
				probe.channel,
				'crash.events',
				'bet.placed',
				{ userId: 'player-3', betAmount: '300', roundId: 'r-1' },
				messageId,
			)

			// Give the consumer time to (not) process duplicate
			await new Promise((r) => setTimeout(r, 300))

			const wallet = await fetchWallet('player-3')
			expect(wallet?.balance).toBe(700n)
		})
	})

	describe('player.won → credit', () => {
		it('credits the wallet on success', async () => {
			await seedWallet(orm, { playerId: 'winner', balance: 0n })

			await publishEvent(probe.channel, 'crash.events', 'player.won', {
				userId: 'winner',
				amount: '500',
			})

			const wallet = await pollUntil(
				() => fetchWallet('winner'),
				(w) => w.balance === 500n,
			)
			expect(wallet.balance).toBe(500n)
		})

		it('is idempotent on duplicate messageId', async () => {
			await seedWallet(orm, { playerId: 'winner-2', balance: 0n })
			const messageId = randomUUID()

			await publishEvent(
				probe.channel,
				'crash.events',
				'player.won',
				{ userId: 'winner-2', amount: '500' },
				messageId,
			)
			await pollUntil(
				() => fetchWallet('winner-2'),
				(w) => w.balance === 500n,
			)

			await publishEvent(
				probe.channel,
				'crash.events',
				'player.won',
				{ userId: 'winner-2', amount: '500' },
				messageId,
			)
			await new Promise((r) => setTimeout(r, 300))

			const wallet = await fetchWallet('winner-2')
			expect(wallet?.balance).toBe(500n)
		})
	})
})
