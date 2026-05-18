import { GetLeaderboardQuery } from '@application/leaderboard/dtos/get-leaderboard.query'
import {
	type LeaderboardRow,
	toLeaderboardEntry,
} from '@application/leaderboard/dtos/leaderboard.dto'
import { type LeaderboardResponse, LeaderboardWindow } from '@crash/contracts'
import { Bet, BetStatus } from '@domain/bet/bet.entity'
import { CLOCK, type Clock } from '@domain/shared/clock'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { InjectRepository } from '@mikro-orm/nestjs'
import { Inject, Injectable } from '@nestjs/common'

interface CacheEntry {
	expiresAt: number
	response: LeaderboardResponse
}

const CACHE_TTL_MS = 30_000

const WINDOW_MS: Record<LeaderboardWindow, number> = {
	[LeaderboardWindow.TWENTY_FOUR_HOURS]: 24 * 60 * 60 * 1_000,
	[LeaderboardWindow.SEVEN_DAYS]: 7 * 24 * 60 * 60 * 1_000,
}

interface QueryRow {
	userId: string
	username: string
	winningsCents: string | number | bigint
	betsCount: string | number
	biggestMultiplierHundredths: string | number
}

/**
 * MikroORM v7's QueryBuilder is typed against entity props and rejects
 * aggregate aliases / raw column selects. Cast to a loose shape — runtime
 * API is unchanged, we just bypass the alias type check.
 */
interface LooseQb {
	select(fields: string[]): LooseQb
	where(cond: object): LooseQb
	groupBy(fields: string[]): LooseQb
	orderBy(order: Record<string, 'asc' | 'desc'>): LooseQb
	limit(n: number): LooseQb
	execute(mode: 'all'): Promise<QueryRow[]>
}

@Injectable()
export class GetLeaderboardUseCase {
	private readonly cache = new Map<LeaderboardWindow, CacheEntry>()

	constructor(
		@InjectRepository(Bet)
		private readonly bets: BaseRepository<Bet>,
		@Inject(CLOCK) private readonly clock: Clock,
	) {}

	async execute(query: GetLeaderboardQuery): Promise<LeaderboardResponse> {
		const now = this.clock.now()
		const cached = this.cache.get(query.window)
		if (cached && cached.expiresAt > now.getTime()) {
			return cached.response
		}

		const windowStart = new Date(now.getTime() - WINDOW_MS[query.window])
		const qb = this.bets.createQueryBuilder('b') as unknown as LooseQb
		qb.select([
			'b.user_id as "userId"',
			'b.username as "username"',
			'SUM(b.payout_cents - b.amount_cents) as "winningsCents"',
			'COUNT(*) as "betsCount"',
			'MAX(b.cashout_multiplier_hundredths) as "biggestMultiplierHundredths"',
		])
		qb.where({ status: BetStatus.WON, createdAt: { $gt: windowStart } })
		qb.groupBy(['b.user_id', 'b.username'])
		qb.orderBy({ winningsCents: 'desc' })
		qb.limit(query.limit)
		const rows = await qb.execute('all')

		const response: LeaderboardResponse = {
			window: query.window,
			entries: rows.map((r) =>
				toLeaderboardEntry({
					userId: r.userId,
					username: r.username,
					winningsCents: toBigInt(r.winningsCents),
					betsCount: Number(r.betsCount),
					biggestMultiplierHundredths: Number(r.biggestMultiplierHundredths),
				} satisfies LeaderboardRow),
			),
			generatedAt: now.toISOString(),
		}

		this.cache.set(query.window, {
			response,
			expiresAt: now.getTime() + CACHE_TTL_MS,
		})
		return response
	}
}

const toBigInt = (value: string | number | bigint): bigint => {
	if (typeof value === 'bigint') return value
	if (typeof value === 'number') return BigInt(Math.trunc(value))
	return BigInt(value)
}
