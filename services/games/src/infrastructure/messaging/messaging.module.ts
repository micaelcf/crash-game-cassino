import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ScheduleModule } from '@nestjs/schedule';
import { AmqpConnection } from './amqp/amqp-connection.provider';
import { RABBIT_PUBLISHER } from './amqp/rabbit-publisher';
import { GAMES_TOPOLOGY } from './amqp/topology';
import { GamesConsumer } from './consumers/games.consumer';
import { OutboxEvent } from './outbox/outbox-event.entity';
import { OutboxPublisher } from './outbox/outbox.publisher';

const RABBIT_URL =
  process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';
const RABBIT_EXCHANGE = process.env.RABBITMQ_EXCHANGE || 'crash.events';

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
