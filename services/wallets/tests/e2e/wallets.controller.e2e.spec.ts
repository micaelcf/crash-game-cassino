import type { MikroORM } from '@mikro-orm/core'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
	type PgHandle,
	type RabbitHandle,
	startPostgres,
	startRabbit,
	stopContainer,
} from './utils/containers'
import { seedWallet } from './utils/fixtures'
import { bootstrapTestApp, closeTestApp, type TestApp } from './utils/test-app'
import { truncateAllTables } from './utils/truncate'

describe('Wallets controller (e2e)', () => {
	let pg: PgHandle
	let rabbit: RabbitHandle
	let testApp: TestApp
	let app: INestApplication
	let orm: MikroORM

	beforeAll(async () => {
		;[pg, rabbit] = await Promise.all([startPostgres(), startRabbit()])
		testApp = await bootstrapTestApp({ pgUrl: pg.url, rabbitUrl: rabbit.url })
		app = testApp.app
		orm = testApp.orm
	}, 180_000)

	afterAll(async () => {
		if (testApp) await closeTestApp(testApp)
		await Promise.all([
			pg ? stopContainer(pg) : Promise.resolve(),
			rabbit ? stopContainer(rabbit) : Promise.resolve(),
		])
	})

	afterEach(async () => {
		await truncateAllTables(orm)
	})

	describe('POST /wallets', () => {
		it('rejects unauthenticated requests with 401', async () => {
			await request(app.getHttpServer()).post('/').expect(401)
		})

		it('creates a wallet with default balance for new player', async () => {
			const res = await request(app.getHttpServer())
				.post('/')
				.set('x-mock-user-id', 'player-1')
				.expect(201)

			expect(res.body).toMatchObject({
				playerId: 'player-1',
				balance: '100000',
			})
			expect(res.body.id).toEqual(expect.any(String))
		})

		it('returns 409 when wallet already exists for the player', async () => {
			await request(app.getHttpServer())
				.post('/')
				.set('x-mock-user-id', 'player-1')
				.expect(201)

			await request(app.getHttpServer())
				.post('/')
				.set('x-mock-user-id', 'player-1')
				.expect(409)
		})
	})

	describe('GET /wallets/me', () => {
		it('rejects unauthenticated requests with 401', async () => {
			await request(app.getHttpServer()).get('/me').expect(401)
		})

		it('returns 404 when the authenticated player has no wallet', async () => {
			await request(app.getHttpServer())
				.get('/me')
				.set('x-mock-user-id', 'ghost')
				.expect(404)
		})

		it('returns the wallet for the authenticated player', async () => {
			await seedWallet(orm, { playerId: 'player-1', balance: 42500n })

			const res = await request(app.getHttpServer())
				.get('/me')
				.set('x-mock-user-id', 'player-1')
				.expect(200)

			expect(res.body).toMatchObject({
				playerId: 'player-1',
				balance: '42500',
			})
		})
	})
})
