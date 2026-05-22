import 'reflect-metadata'
import { MikroORM } from '@mikro-orm/core'
import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import {
	FastifyAdapter,
	NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { SwaggerModule } from '@nestjs/swagger'
import { apiReference } from '@scalar/nestjs-api-reference'
import { AppModule } from '@/app.module'
import { buildSwaggerConfig } from '@/swagger.config'

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter(),
	)
	const port = Number(process.env.PORT ?? 4001)

	await app.get(MikroORM).migrator.up()

	const document = SwaggerModule.createDocument(app, buildSwaggerConfig())
	app.use(
		'/docs',
		apiReference({
			content: document,
			withFastify: true,
			theme: 'saturn',
		}),
	)

	app.connectMicroservice<MicroserviceOptions>({
		transport: Transport.RMQ,
		options: {
			urls: [process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672'],
			queue: 'games.events',
			queueOptions: {
				durable: true,
				arguments: { 'x-dead-letter-exchange': 'crash.events.dlx' },
			},
			noAck: false,
		},
	})

	await app.startAllMicroservices()
	await app.listen(port, '0.0.0.0')
	console.log(`Games service running on port ${port} (HTTP + WS + RMQ)`)
}

bootstrap().catch((err) => {
	console.error(err)
	process.exit(1)
})
