import { WalletSchema } from '@domain/wallet/wallet.entity'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { InboxEventSchema } from '@infrastructure/messaging/inbox/inbox-event.entity'
import { OutboxEventSchema } from '@infrastructure/messaging/outbox/outbox-event.entity'
import { Migrator } from '@mikro-orm/migrations'
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
	extensions: [Migrator],
	migrations: {
		path: 'src/migrations',
		pathTs: 'src/migrations',
		tableName: 'mikro_orm_migrations',
		transactional: true,
		allOrNothing: true,
		emit: 'ts',
		disableForeignKeys: false,
	},
	autoLoadEntities: true,
}

export default config
