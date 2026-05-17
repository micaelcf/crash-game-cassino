import { InjectRepository } from '@mikro-orm/nestjs'
import { Injectable } from '@nestjs/common'
import { BaseRepository } from '../../db/base.repository'
import { OutboxEvent } from './outbox-event.entity'

/**
 * Use-case-facing facade over the transactional outbox. Records a pending
 * event inside the current MikroORM Unit of Work so it commits atomically
 * with the aggregate state change. The OutboxPublisher polls the table and
 * publishes to RabbitMQ on its own cadence.
 */
@Injectable()
export class EventPublisher {
	constructor(
		@InjectRepository(OutboxEvent)
		private readonly outboxRepository: BaseRepository<OutboxEvent>,
	) {}

	publish(
		eventType: string,
		aggregateType: string,
		aggregateId: string,
		payload: Record<string, unknown>,
	): void {
		this.outboxRepository.create({
			eventType,
			aggregateType,
			aggregateId,
			payload,
		})
	}
}
