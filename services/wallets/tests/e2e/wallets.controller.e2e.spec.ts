import { Wallet } from '@domain/wallet/wallet.entity'
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

const DEFAULT_BALANCE_CENTS = '100000'

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

	describe('GET /wallets/me', () => {
		it('rejects unauthenticated requests with 401', async () => {
			await request(app.getHttpServer()).get('/me').expect(401)
		})

		it('auto-provisions a wallet with the default balance for a first-time player', async () => {
			const res = await request(app.getHttpServer())
				.get('/me')
				.set('x-mock-user-id', 'newcomer')
				.expect(200)

			expect(res.body).toMatchObject({
				playerId: 'newcomer',
				balance: DEFAULT_BALANCE_CENTS,
			})
			expect(res.body.id).toEqual(expect.any(String))

			// Persisted, not just synthesized
			const persisted = await orm.em.fork().findOne(Wallet, {
				playerId: 'newcomer',
			})
			expect(persisted).not.toBeNull()
			expect(persisted?.balance).toBe(100000n)
		})

		it('is idempotent: repeated reads return the same wallet row', async () => {
			const first = await request(app.getHttpServer())
				.get('/me')
				.set('x-mock-user-id', 'returning')
				.expect(200)

			const second = await request(app.getHttpServer())
				.get('/me')
				.set('x-mock-user-id', 'returning')
				.expect(200)

			expect(second.body.id).toBe(first.body.id)
		})

		it('returns the existing wallet (does not reset) when one already exists', async () => {
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
