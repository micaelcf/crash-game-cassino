import { type Options, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { WalletSchema } from '../../domain/wallet/wallet.entity';
import { InboxEventSchema } from '../messaging/inbox/inbox-event.entity';
import { OutboxEventSchema } from '../messaging/outbox/outbox-event.entity';
import { BaseRepository } from './base.repository';

const config: Options = {
  driver: PostgreSqlDriver,
  clientUrl:
    process.env.DATABASE_URL ||
    'postgresql://admin:admin@localhost:5432/wallets',
  entities: [WalletSchema, InboxEventSchema, OutboxEventSchema],
  entityRepository: BaseRepository,
  debug: process.env.NODE_ENV !== 'production',
  migrations: {
    path: 'dist/migrations',
    pathTs: 'src/migrations',
    disableForeignKeys: false,
  },
};

export default config;
