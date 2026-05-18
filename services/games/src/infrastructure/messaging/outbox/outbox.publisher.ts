import { BaseRepository } from '@infrastructure/db/base.repository'
import {
	RABBIT_PUBLISHER,
	type RabbitPublisher,
} from '@infrastructure/messaging/amqp/rabbit-publisher'
import { OutboxEvent } from '@infrastructure/messaging/outbox/outbox-event.entity'
import { GameMetrics } from '@infrastructure/observability/game-metrics'
import { MikroORM, RequestContext } from '@mikro-orm/core'
import { InjectRepository } from '@mikro-orm/nestjs'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'

const BATCH_SIZE = 100

@Injectable()
export class OutboxPublisher {
	private readonly logger = new Logger(OutboxPublisher.name)
	private draining = false

	constructor(
		private readonly orm: MikroORM,
		@InjectRepository(OutboxEvent)
		private readonly outboxRepository: BaseRepository<OutboxEvent>,
		@Inject(RABBIT_PUBLISHER) private readonly publisher: RabbitPublisher,
		@Inject('RABBIT_EXCHANGE') private readonly exchange: string,
		private readonly metrics: GameMetrics,
	) {}

	@Interval(500)
	async tick(): Promise<void> {
		if (this.draining) return
		this.draining = true
		try {
			await RequestContext.create(this.orm.em, () => this.drain())
		} catch (err) {
			this.logger.error('outbox drain failed', err as Error)
		} finally {
			this.draining = false
		}
	}

	async drain(): Promise<void> {
		const pending = await this.outboxRepository.find(
			{ publishedAt: null },
			{ orderBy: { createdAt: 'asc' }, limit: BATCH_SIZE },
		)

		if (pending.length === 0) return

		let mutated = false
		for (const evt of pending) {
			try {
				await this.publisher.publish(
					this.exchange,
					evt.eventType,
					evt.payload,
					{
						messageId: evt.id,
						persistent: true,
					},
				)
				evt.markPublished()
				const publishedAt = evt.publishedAt ?? new Date()
				this.metrics.observeOutboxLag(
					publishedAt.getTime() - evt.createdAt.getTime(),
				)
				mutated = true
			} catch (_err) {
				evt.recordAttempt()
				this.logger.warn(
					`publish failed for ${evt.eventType} (${evt.id}), attempts=${evt.attempts}`,
				)
				mutated = true
			}
		}

		if (mutated) {
			await this.outboxRepository.flush()
		}
	}
}
