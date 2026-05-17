import { randomUUID } from 'node:crypto'
import { defineEntity, type InferEntity } from '@mikro-orm/core'

export const OutboxEventSchema = defineEntity({
	name: 'OutboxEvent',
	tableName: 'outbox_events',
	properties: (p) => ({
		id: p.uuid().primary().onCreate(() => randomUUID()),
		eventType: p.string(),
		aggregateType: p.string(),
		aggregateId: p.string(),
		payload: p.json(),
		createdAt: p.datetime().onCreate(() => new Date()),
		publishedAt: p.datetime().nullable(),
		attempts: p.integer().default(0),
	}),
})

export type IOutboxEvent = InferEntity<typeof OutboxEventSchema>

export class OutboxEvent extends OutboxEventSchema.class {
	markPublished(): void {
		this.publishedAt = new Date()
	}

	recordAttempt(): void {
		this.attempts += 1
	}
}

OutboxEventSchema.setClass(OutboxEvent)
