import 'reflect-metadata'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { NestFactory } from '@nestjs/core'
import {
	FastifyAdapter,
	type NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { SwaggerModule } from '@nestjs/swagger'
import { AppModule } from '@/app.module'
import { buildSwaggerConfig } from '@/swagger.config'

const OUT_PATH = resolve(import.meta.dir, '..', 'openapi.json')

async function dump(): Promise<void> {
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter(),
		{ logger: false, abortOnError: false },
	)
	const document = SwaggerModule.createDocument(app, buildSwaggerConfig())
	writeFileSync(OUT_PATH, JSON.stringify(document, null, 2))
	await app.close()
	console.log(`✓ Wrote ${OUT_PATH}`)
}

dump()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err)
		process.exit(1)
	})
