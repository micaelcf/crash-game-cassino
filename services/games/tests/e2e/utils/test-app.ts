import 'reflect-metadata'
import { MikroORM } from '@mikro-orm/core'
import { ValidationPipe } from '@nestjs/common'
import { Transport } from '@nestjs/microservices'
import {
	FastifyAdapter,
	type NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'

export interface TestApp {
	app: NestFastifyApplication
	orm: MikroORM
	rabbitUrl: string
}

export interface TestAppOptions {
	pgUrl: string
	rabbitUrl: string
	env?: Record<string, string>
}

const FAST_ORCHESTRATOR_ENV = {
	BETTING_PHASE_MS: '200',
	INTER_ROUND_GAP_MS: '50',
	CRASH_GROWTH_RATE: '1.5',
	CRASH_CLIENT_SEED: 'e2e-client-seed',
}

export const bootstrapTestApp = async (
	opts: TestAppOptions,
): Promise<TestApp> => {
	process.env.DATABASE_URL = opts.pgUrl
	process.env.RABBITMQ_URL = opts.rabbitUrl
	process.env.RABBITMQ_EXCHANGE = 'crash.events'
	process.env.NODE_ENV = 'test'
	for (const [k, v] of Object.entries(FAST_ORCHESTRATOR_ENV)) {
		process.env[k] = v
	}
	for (const [k, v] of Object.entries(opts.env ?? {})) {
		process.env[k] = v
	}

	const { AppModule } = await import('../../../src/app.module')

	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile()

	const app = moduleRef.createNestApplication<NestFastifyApplication>(
		new FastifyAdapter(),
	)
	app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))

	app.connectMicroservice({
		transport: Transport.RMQ,
		options: {
			urls: [opts.rabbitUrl],
			queue: 'games.events',
			queueOptions: {
				durable: true,
				arguments: { 'x-dead-letter-exchange': 'crash.events.dlx' },
			},
			noAck: false,
		},
	})

	const orm = app.get(MikroORM)
	await orm.schema.ensureDatabase()
	await orm.schema.refresh()

	await app.init()
	await app.getHttpAdapter().getInstance().ready()
	await app.startAllMicroservices()

	return { app, orm, rabbitUrl: opts.rabbitUrl }
}

export const closeTestApp = async (handle: TestApp): Promise<void> => {
	await handle.app.close()
}
