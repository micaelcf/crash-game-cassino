import 'reflect-metadata'
import { MikroORM } from '@mikro-orm/core'
import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import {
	FastifyAdapter,
	NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { apiReference } from '@scalar/nestjs-api-reference'
import { AppModule } from '@/app.module'

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter(),
	)
	const port = Number(process.env.PORT ?? 4002)

	await app.get(MikroORM).migrator.up()

	const swaggerConfig = new DocumentBuilder()
		.setTitle('Wallets Service')
		.setDescription('Player wallet management API for Crash Game.')
		.setVersion('0.1.0')
		.addBearerAuth()
		.build()
	const document = SwaggerModule.createDocument(app, swaggerConfig)
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
			queue: 'wallets.events',
			queueOptions: {
				durable: true,
				arguments: { 'x-dead-letter-exchange': 'crash.events.dlx' },
			},
			noAck: false,
		},
	})

	await app.startAllMicroservices()
	await app.listen(port, '0.0.0.0')
	console.log(`Wallets service running on port ${port} (HTTP & RMQ)`)
}

bootstrap().catch((err) => {
	console.error(err)
	process.exit(1)
})
