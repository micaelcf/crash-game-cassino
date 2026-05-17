import type { MikroORM } from '@mikro-orm/core'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { RoundStatus } from '../../src/domain/round/round.entity'
import {
	type PgHandle,
	type RabbitHandle,
	startPostgres,
	startRabbit,
	stopContainer,
} from './utils/containers'
import { bootstrapTestApp, closeTestApp, type TestApp } from './utils/test-app'
import { truncateAllTables } from './utils/truncate'

const POLL_INTERVAL_MS = 50

const waitForRoundStatus = async (
	app: TestApp['app'],
	status: RoundStatus,
	timeoutMs = 5_000,
): Promise<any> => {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		const res = await request(app.getHttpServer()).get('/rounds/current')
		if (res.body && res.body.status === status) return res.body
		await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
	}
	throw new Error(`Timed out waiting for round status ${status}`)
}

describe('Rounds controller (e2e)', () => {
	let pg: PgHandle
	let rabbit: RabbitHandle
	let testApp: TestApp
	let orm: MikroORM

	beforeAll(async () => {
		;[pg, rabbit] = await Promise.all([startPostgres(), startRabbit()])
		testApp = await bootstrapTestApp({ pgUrl: pg.url, rabbitUrl: rabbit.url })
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

	it('GET /rounds/current returns a round in BETTING_PHASE with the commitment exposed', async () => {
		const body = await waitForRoundStatus(
			testApp.app,
			RoundStatus.BETTING_PHASE,
		)
		expect(body).toMatchObject({
			status: 'BETTING_PHASE',
			crashPointHundredths: null,
			serverSeed: null,
		})
		expect(body.hashCommitment).toEqual(expect.any(String))
		expect(body.hashCommitment.length).toBeGreaterThan(0)
	})

	it('GET /rounds/:id/verify returns 400 while round is not crashed', async () => {
		const body = await waitForRoundStatus(
			testApp.app,
			RoundStatus.BETTING_PHASE,
		)
		await request(testApp.app.getHttpServer())
			.get(`/rounds/${body.id}/verify`)
			.expect(400)
	})

	it('GET /rounds/:id/verify returns the verification payload after crash', async () => {
		const crashed = await waitForRoundStatus(
			testApp.app,
			RoundStatus.CRASHED,
			10_000,
		)

		const verify = await request(testApp.app.getHttpServer())
			.get(`/rounds/${crashed.id}/verify`)
			.expect(200)

		expect(verify.body).toMatchObject({
			nonce: expect.any(Number),
			serverSeed: expect.any(String),
			clientSeed: expect.any(String),
			crashPointHundredths: crashed.crashPointHundredths,
		})
	})

	it('GET /rounds/history paginates crashed rounds', async () => {
		// wait for at least one crash
		await waitForRoundStatus(testApp.app, RoundStatus.CRASHED, 10_000)
		// give the orchestrator time to produce a couple more rounds
		await new Promise((r) => setTimeout(r, 1_500))

		const res = await request(testApp.app.getHttpServer())
			.get('/rounds/history?page=1&pageSize=2')
			.expect(200)

		expect(res.body.items.length).toBeLessThanOrEqual(2)
		expect(res.body.total).toBeGreaterThanOrEqual(1)
		expect(res.body.page).toBe(1)
		expect(res.body.pageSize).toBe(2)
	})

	it('GET /rounds/history rejects invalid pagination (page=0)', async () => {
		await request(testApp.app.getHttpServer())
			.get('/rounds/history?page=0')
			.expect(400)
	})
})
