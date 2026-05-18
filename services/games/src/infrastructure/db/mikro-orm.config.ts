import { BetSchema } from '@domain/bet/bet.entity'
import { RoundSchema } from '@domain/round/round.entity'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { InboxEventSchema } from '@infrastructure/messaging/inbox/inbox-event.entity'
import { OutboxEventSchema } from '@infrastructure/messaging/outbox/outbox-event.entity'
import { MikroOrmModuleSyncOptions } from '@mikro-orm/nestjs'
import { PostgreSqlDriver } from '@mikro-orm/postgresql'

const config: MikroOrmModuleSyncOptions = {
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
	autoLoadEntities: true,
}

export default config
