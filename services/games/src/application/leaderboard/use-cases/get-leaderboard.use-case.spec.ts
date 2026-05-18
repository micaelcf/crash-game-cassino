import { GetLeaderboardQuery } from '@application/leaderboard/dtos/get-leaderboard.query'
import { GetLeaderboardUseCase } from '@application/leaderboard/use-cases/get-leaderboard.use-case'
import { LeaderboardWindow } from '@crash/contracts'
import { Bet, BetStatus } from '@domain/bet/bet.entity'
import type { Clock } from '@domain/shared/clock'
import type { BaseRepository } from '@infrastructure/db/base.repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type BetRepo = BaseRepository<Bet>

const clockAt = (iso: string): Clock => ({ now: () => new Date(iso) })

const makeQbMock = (rows: unknown[]) => {
	const calls: Array<{
		method: string
		args: unknown[]
	}> = []
	const qb: Record<string, unknown> = {}
	const chain = (method: string) =>
		vi.fn((...args: unknown[]) => {
			calls.push({ method, args })
			return qb
		})
	qb.select = chain('select')
	qb.where = chain('where')
	qb.groupBy = chain('groupBy')
	qb.orderBy = chain('orderBy')
	qb.limit = chain('limit')
	qb.execute = vi.fn(async () => rows)
	return { qb, calls }
}

const makeRepo = (rows: unknown[]) => {
	const { qb, calls } = makeQbMock(rows)
	return {
		repo: {
			createQueryBuilder: vi.fn(() => qb),
		} as unknown as BetRepo,
		qb,
		calls,
	}
}

describe('GetLeaderboardUseCase', () => {
	beforeEach(() => vi.clearAllMocks())

	it('queries WON bets within the 24h window and orders by winnings desc', async () => {
		const { repo, calls, qb } = makeRepo([
			{
				userId: 'u-1',
				username: 'alice',
				winningsCents: '500',
				betsCount: '3',
				biggestMultiplierHundredths: 250,
			},
		])
		const useCase = new GetLeaderboardUseCase(
			repo,
			clockAt('2026-05-18T12:00:00Z'),
		)

		const result = await useCase.execute(
			new GetLeaderboardQuery(LeaderboardWindow.TWENTY_FOUR_HOURS, 10),
		)

		expect(qb.execute).toHaveBeenCalledWith('all')
		const where = calls.find((c) => c.method === 'where')
		expect(where).toBeDefined()
		const whereArgs = where?.args[0] as {
			status: BetStatus
			createdAt: { $gt: Date }
		}
		expect(whereArgs.status).toBe(BetStatus.WON)
		expect(whereArgs.createdAt.$gt.toISOString()).toBe(
			'2026-05-17T12:00:00.000Z',
		)
		const order = calls.find((c) => c.method === 'orderBy')
		expect(order?.args[0]).toEqual({ winningsCents: 'desc' })
		const limit = calls.find((c) => c.method === 'limit')
		expect(limit?.args[0]).toBe(10)

		expect(result.window).toBe(LeaderboardWindow.TWENTY_FOUR_HOURS)
		expect(result.entries).toHaveLength(1)
		expect(result.entries[0]).toEqual({
			userId: 'u-1',
			username: 'alice',
			winningsCents: '500',
			betsCount: 3,
			biggestMultiplierHundredths: 250,
		})
		expect(typeof result.generatedAt).toBe('string')
	})

	it('uses a 7-day window when requested', async () => {
		const { repo, calls } = makeRepo([])
		const useCase = new GetLeaderboardUseCase(
			repo,
			clockAt('2026-05-18T12:00:00Z'),
		)

		await useCase.execute(new GetLeaderboardQuery(LeaderboardWindow.SEVEN_DAYS))

		const where = calls.find((c) => c.method === 'where')
		const whereArgs = where?.args[0] as { createdAt: { $gt: Date } }
		expect(whereArgs.createdAt.$gt.toISOString()).toBe(
			'2026-05-11T12:00:00.000Z',
		)
	})

	it('defaults limit to 20 when omitted', async () => {
		const { repo, calls } = makeRepo([])
		const useCase = new GetLeaderboardUseCase(
			repo,
			clockAt('2026-05-18T12:00:00Z'),
		)

		await useCase.execute(
			new GetLeaderboardQuery(LeaderboardWindow.TWENTY_FOUR_HOURS),
		)

		const limit = calls.find((c) => c.method === 'limit')
		expect(limit?.args[0]).toBe(20)
	})

	it('serialises bigint winnings as decimal strings', async () => {
		const { repo } = makeRepo([
			{
				userId: 'u-2',
				username: 'bob',
				winningsCents: 12_345_678n,
				betsCount: 1,
				biggestMultiplierHundredths: 1000,
			},
		])
		const useCase = new GetLeaderboardUseCase(
			repo,
			clockAt('2026-05-18T12:00:00Z'),
		)

		const result = await useCase.execute(
			new GetLeaderboardQuery(LeaderboardWindow.TWENTY_FOUR_HOURS),
		)

		expect(result.entries[0].winningsCents).toBe('12345678')
	})

	it('caches results per window for 30 seconds', async () => {
		const { repo } = makeRepo([
			{
				userId: 'u-1',
				username: 'alice',
				winningsCents: '500',
				betsCount: '1',
				biggestMultiplierHundredths: 200,
			},
		])
		let nowMs = Date.parse('2026-05-18T12:00:00Z')
		const clock: Clock = { now: () => new Date(nowMs) }
		const useCase = new GetLeaderboardUseCase(repo, clock)

		await useCase.execute(
			new GetLeaderboardQuery(LeaderboardWindow.TWENTY_FOUR_HOURS),
		)
		await useCase.execute(
			new GetLeaderboardQuery(LeaderboardWindow.TWENTY_FOUR_HOURS),
		)
		expect(repo.createQueryBuilder).toHaveBeenCalledTimes(1)

		nowMs += 31_000
		await useCase.execute(
			new GetLeaderboardQuery(LeaderboardWindow.TWENTY_FOUR_HOURS),
		)
		expect(repo.createQueryBuilder).toHaveBeenCalledTimes(2)
	})
})
