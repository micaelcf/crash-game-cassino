import {
	declareTopology,
	WALLETS_TOPOLOGY,
} from '@infrastructure/messaging/amqp/topology'
import { Channel } from 'amqplib'
import { describe, expect, it, vi } from 'vitest'

describe('declareTopology', () => {
	it('asserts the exchange, dead-letter exchange, queue with DLX argument and routing key bindings', async () => {
		const channel: Pick<
			Channel,
			'assertExchange' | 'assertQueue' | 'bindQueue'
		> = {
			assertExchange: vi.fn().mockResolvedValue({}),
			assertQueue: vi.fn().mockResolvedValue({}),
			bindQueue: vi.fn().mockResolvedValue({}),
		}

		await declareTopology(channel as Channel, WALLETS_TOPOLOGY)

		expect(channel.assertExchange).toHaveBeenCalledWith(
			'crash.events',
			'topic',
			{ durable: true },
		)
		expect(channel.assertExchange).toHaveBeenCalledWith(
			'crash.events.dlx',
			'topic',
			{
				durable: true,
			},
		)
		expect(channel.assertQueue).toHaveBeenCalledWith('wallets.events', {
			durable: true,
			arguments: { 'x-dead-letter-exchange': 'crash.events.dlx' },
		})
		expect(channel.bindQueue).toHaveBeenCalledWith(
			'wallets.events',
			'crash.events',
			'bet.placed',
		)
		expect(channel.bindQueue).toHaveBeenCalledWith(
			'wallets.events',
			'crash.events',
			'player.won',
		)
	})

	it('skips the DLX wiring when no deadLetterExchange is configured', async () => {
		const channel: Pick<
			Channel,
			'assertExchange' | 'assertQueue' | 'bindQueue'
		> = {
			assertExchange: vi.fn().mockResolvedValue({}),
			assertQueue: vi.fn().mockResolvedValue({}),
			bindQueue: vi.fn().mockResolvedValue({}),
		}

		await declareTopology(channel as Channel, {
			exchange: 'evts',
			exchangeType: 'topic',
			queues: [{ name: 'q', routingKeys: ['k'] }],
		})

		expect(channel.assertExchange).toHaveBeenCalledTimes(1)
		expect(channel.assertQueue).toHaveBeenCalledWith('q', {
			durable: true,
			arguments: {},
		})
		expect(channel.bindQueue).toHaveBeenCalledWith('q', 'evts', 'k')
	})
})
