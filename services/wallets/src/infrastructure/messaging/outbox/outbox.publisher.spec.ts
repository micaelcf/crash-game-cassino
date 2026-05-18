import { OutboxPublisher } from '@infrastructure/messaging/outbox/outbox.publisher'
import { OutboxEvent } from '@infrastructure/messaging/outbox/outbox-event.entity'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const newEvent = (data: Partial<OutboxEvent> = {}): OutboxEvent => {
	const e = Object.create(OutboxEvent.prototype) as OutboxEvent
	Object.assign(e, {
		id: crypto.randomUUID(),
		eventType: 'wallet.debited',
		aggregateType: 'Wallet',
		aggregateId: 'w-1',
		payload: {},
		createdAt: new Date(),
		publishedAt: null,
		attempts: 0,
		...data,
	})
	return e
}

const makeRepo = (rows: OutboxEvent[]) => ({
	find: vi.fn().mockResolvedValue(rows),
	flush: vi.fn().mockResolvedValue(undefined),
})

const makePublisher = () => ({
	publish: vi.fn().mockResolvedValue(undefined),
})

const fakeOrm = {} as any

describe('OutboxPublisher', () => {
	beforeEach(() => vi.clearAllMocks())

	it('publishes pending events and marks them as published', async () => {
		const evt = newEvent({ payload: { amount: '100' } })
		const repo = makeRepo([evt])
		const channel = makePublisher()

		const publisher = new OutboxPublisher(
			fakeOrm,
			repo as any,
			channel as any,
			'crash.events',
		)

		await publisher.drain()

		expect(channel.publish).toHaveBeenCalledWith(
			'crash.events',
			'wallet.debited',
			{ amount: '100' },
			expect.objectContaining({ messageId: evt.id, persistent: true }),
		)
		expect(evt.publishedAt).toBeInstanceOf(Date)
		expect(repo.flush).toHaveBeenCalled()
	})

	it('does nothing when there are no pending events', async () => {
		const repo = makeRepo([])
		const channel = makePublisher()
		const publisher = new OutboxPublisher(
			fakeOrm,
			repo as any,
			channel as any,
			'crash.events',
		)

		await publisher.drain()

		expect(channel.publish).not.toHaveBeenCalled()
		expect(repo.flush).not.toHaveBeenCalled()
	})

	it('records attempt and leaves event unpublished when publish fails', async () => {
		const evt = newEvent()
		const repo = makeRepo([evt])
		const channel = {
			publish: vi.fn().mockRejectedValue(new Error('broker down')),
		}
		const publisher = new OutboxPublisher(
			fakeOrm,
			repo as any,
			channel as any,
			'crash.events',
		)

		await publisher.drain()

		expect(evt.publishedAt).toBeNull()
		expect(evt.attempts).toBe(1)
		expect(repo.flush).toHaveBeenCalled()
	})
})
