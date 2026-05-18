import 'reflect-metadata'
import { MikroORM } from '@mikro-orm/core'
import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import {
	FastifyAdapter,
	NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from '@/app.module'

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter(),
	)
	const port = Number(process.env.PORT ?? 4001)

	await app.get(MikroORM).schema.update({ safe: true })

	const swaggerConfig = new DocumentBuilder()
		.setTitle('Games Service')
		.setDescription('Crash Game engine API: rounds, bets, provably fair.')
		.setVersion('0.1.0')
		.addBearerAuth()
		.build()
	const document = SwaggerModule.createDocument(app, swaggerConfig)
	SwaggerModule.setup('docs', app, document)

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
