import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
	type PgHandle,
	type RabbitHandle,
	startPostgres,
	startRabbit,
	stopContainer,
} from './utils/containers'
import { bootstrapTestApp, closeTestApp, type TestApp } from './utils/test-app'

describe('Health (e2e)', () => {
	let pg: PgHandle
	let rabbit: RabbitHandle
	let testApp: TestApp

	beforeAll(async () => {
		;[pg, rabbit] = await Promise.all([startPostgres(), startRabbit()])
		testApp = await bootstrapTestApp({ pgUrl: pg.url, rabbitUrl: rabbit.url })
	}, 180_000)

	afterAll(async () => {
		if (testApp) await closeTestApp(testApp)
		await Promise.all([
			pg ? stopContainer(pg) : Promise.resolve(),
			rabbit ? stopContainer(rabbit) : Promise.resolve(),
		])
	})

	it('GET /health returns service info', async () => {
		const res = await request(testApp.app.getHttpServer())
			.get('/health')
			.expect(200)

		expect(res.body).toEqual({ status: 'ok', service: 'games' })
	})
})
