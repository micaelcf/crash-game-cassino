import { AmqpConnection } from '@infrastructure/messaging/amqp/amqp-connection.provider'
import { RABBIT_PUBLISHER } from '@infrastructure/messaging/amqp/rabbit-publisher'
import { GAMES_TOPOLOGY } from '@infrastructure/messaging/amqp/topology'
import { GamesConsumer } from '@infrastructure/messaging/consumers/games.consumer'
import { OutboxPublisher } from '@infrastructure/messaging/outbox/outbox.publisher'
import { OutboxEvent } from '@infrastructure/messaging/outbox/outbox-event.entity'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { ScheduleModule } from '@nestjs/schedule'

const RABBIT_URL =
	process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672'
const RABBIT_EXCHANGE = process.env.RABBITMQ_EXCHANGE || 'crash.events'

@Module({
	imports: [
		CqrsModule,
		MikroOrmModule.forFeature([OutboxEvent]),
		ScheduleModule.forRoot(),
	],
	controllers: [GamesConsumer],
	providers: [
		{
			provide: AmqpConnection,
			useFactory: () => new AmqpConnection(RABBIT_URL, GAMES_TOPOLOGY),
		},
		{ provide: RABBIT_PUBLISHER, useExisting: AmqpConnection },
		{ provide: 'RABBIT_EXCHANGE', useValue: RABBIT_EXCHANGE },
		OutboxPublisher,
	],
	exports: [
		AmqpConnection,
		RABBIT_PUBLISHER,
		'RABBIT_EXCHANGE',
		OutboxPublisher,
	],
})
export class MessagingModule {}
