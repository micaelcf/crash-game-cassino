import { GetLeaderboardQuery } from '@application/leaderboard/dtos/get-leaderboard.query'
import { GetLeaderboardUseCase } from '@application/leaderboard/use-cases/get-leaderboard.use-case'
import { LeaderboardWindow } from '@crash/contracts'
import { Bet, BetStatus } from '@domain/bet/bet.entity'
import type { Clock } from '@domain/shared/clock'
import type { BaseRepository } from '@infrastructure/db/base.repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type BetRepo = BaseRepository<Bet>

const clockAt = (iso: string): Clock => ({ now: () => new Date(iso) })

interface ExecuteCall {
	sql: string
	params: unknown[]
}

const makeRepo = (rows: unknown[]) => {
	const calls: ExecuteCall[] = []
	const execute = vi.fn(async (sql: string, params: unknown[]) => {
		calls.push({ sql, params })
		return rows
	})
	const connection = { execute }
	const em = { getConnection: () => connection }
	return {
		repo: { getEntityManager: () => em } as unknown as BetRepo,
		execute,
		calls,
	}
}

describe('GetLeaderboardUseCase', () => {
	beforeEach(() => vi.clearAllMocks())

	it('queries WON bets within the 24h window and orders by winnings desc', async () => {
		const { repo, calls, execute } = makeRepo([
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

		expect(execute).toHaveBeenCalledOnce()
		const { sql, params } = calls[0]
		expect(sql).toMatch(/from bets/i)
		expect(sql).toMatch(/group by user_id, username/i)
		expect(sql).toMatch(/order by "winningscents" desc/i)
		expect(sql).toMatch(/limit \?/i)
		expect(params[0]).toBe(BetStatus.WON)
		expect((params[1] as Date).toISOString()).toBe('2026-05-17T12:00:00.000Z')
		expect(params[2]).toBe(10)

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

		expect((calls[0].params[1] as Date).toISOString()).toBe(
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

		expect(calls[0].params[2]).toBe(20)
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
		const { repo, execute } = makeRepo([
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
		expect(execute).toHaveBeenCalledTimes(1)

		nowMs += 31_000
		await useCase.execute(
			new GetLeaderboardQuery(LeaderboardWindow.TWENTY_FOUR_HOURS),
		)
		expect(execute).toHaveBeenCalledTimes(2)
	})
})
