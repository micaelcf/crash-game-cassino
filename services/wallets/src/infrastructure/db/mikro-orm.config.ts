import { WalletSchema } from '@domain/wallet/wallet.entity'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { InboxEventSchema } from '@infrastructure/messaging/inbox/inbox-event.entity'
import { OutboxEventSchema } from '@infrastructure/messaging/outbox/outbox-event.entity'
import { MikroOrmModuleSyncOptions } from '@mikro-orm/nestjs'
import { PostgreSqlDriver } from '@mikro-orm/postgresql'

const config: MikroOrmModuleSyncOptions = {
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
	autoLoadEntities: true,
}

export default config
