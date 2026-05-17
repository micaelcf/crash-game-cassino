import { type Options, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { BetSchema } from '../../domain/bet/bet.entity';
import { RoundSchema } from '../../domain/round/round.entity';
import { InboxEventSchema } from '../messaging/inbox/inbox-event.entity';
import { OutboxEventSchema } from '../messaging/outbox/outbox-event.entity';
import { BaseRepository } from './base.repository';

const config: Options = {
  driver: PostgreSqlDriver,
  clientUrl:
    process.env.DATABASE_URL || 'postgresql://admin:admin@localhost:5432/games',
  entities: [RoundSchema, BetSchema, InboxEventSchema, OutboxEventSchema],
  entityRepository: BaseRepository,
  debug: process.env.NODE_ENV !== 'production',
  migrations: {
    path: 'dist/migrations',
    pathTs: 'src/migrations',
    disableForeignKeys: false,
  },
};

export default config;
