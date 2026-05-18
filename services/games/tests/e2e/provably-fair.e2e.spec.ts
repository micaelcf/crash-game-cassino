import {
	ProvablyFairService,
	sha256,
} from '@domain/round/provably-fair.service'
import { RoundStatus } from '@domain/round/round.entity'
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

interface CurrentRoundBody {
	id: string
	status: RoundStatus
	hashCommitment: string
	serverSeed: string | null
	clientSeed: string
	crashPointHundredths: number | null
	[key: string]: unknown
}

interface VerifyBody {
	serverSeed: string
	clientSeed: string
	nonce: number
	crashPointHundredths: number
}

const waitForCurrentStatus = async (
	app: TestApp['app'],
	status: RoundStatus,
	timeoutMs = 10_000,
): Promise<CurrentRoundBody> => {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		const res = await request(app.getHttpServer()).get('/rounds/current')
		const body = res.body as CurrentRoundBody | undefined
		if (body && body.status === status) return body
		await new Promise((r) => setTimeout(r, 50))
	}
	throw new Error(`Timed out waiting for round status ${status}`)
}

describe('Provably fair (e2e)', () => {
	let pg: PgHandle
	let rabbit: RabbitHandle
	let testApp: TestApp
	const provablyFair = new ProvablyFairService()

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

	it('verify payload sha256(serverSeed) matches the hashCommitment exposed during betting', async () => {
		const betting = await waitForCurrentStatus(
			testApp.app,
			RoundStatus.BETTING_PHASE,
		)
		const hashCommitment = betting.hashCommitment
		const roundId = betting.id

		// wait until that exact round crashes
		const deadline = Date.now() + 10_000
		while (Date.now() < deadline) {
			const res = await request(testApp.app.getHttpServer()).get(
				`/rounds/current`,
			)
			const isOurRoundCrashed =
				res.body &&
				res.body.id === roundId &&
				res.body.status === RoundStatus.CRASHED
			if (isOurRoundCrashed) break
			await new Promise((r) => setTimeout(r, 50))
		}

		const verify = await request(testApp.app.getHttpServer())
			.get(`/rounds/${roundId}/verify`)
			.expect(200)

		const verifyBody = verify.body as VerifyBody
		expect(sha256(verifyBody.serverSeed)).toBe(hashCommitment)
	})

	it('reproducing the multiplier from (serverSeed, clientSeed) yields the recorded crashPoint', async () => {
		// pick any crashed round
		const deadline = Date.now() + 10_000
		let crashed: CurrentRoundBody | null = null
		while (Date.now() < deadline) {
			const res = await request(testApp.app.getHttpServer()).get(
				'/rounds/current',
			)
			const body = res.body as CurrentRoundBody | undefined
			if (body && body.status === RoundStatus.CRASHED) {
				crashed = body
				break
			}
			await new Promise((r) => setTimeout(r, 50))
		}
		if (!crashed) throw new Error('no crashed round observed')

		const verify = await request(testApp.app.getHttpServer())
			.get(`/rounds/${crashed.id}/verify`)
			.expect(200)

		const verifyBody = verify.body as VerifyBody
		const recomputed = provablyFair.crashPointHundredths(
			verifyBody.serverSeed,
			verifyBody.clientSeed,
		)
		expect(recomputed).toBe(crashed.crashPointHundredths)
	})
})
