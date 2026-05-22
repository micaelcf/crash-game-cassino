import { GetLeaderboardQuery } from '@application/leaderboard/dtos/get-leaderboard.query'
import {
	type LeaderboardResponseDto,
	type LeaderboardRow,
	LeaderboardWindow,
	toLeaderboardEntry,
} from '@application/leaderboard/dtos/leaderboard.dto'
import { Bet, BetStatus } from '@domain/bet/bet.entity'
import { CLOCK, type Clock } from '@domain/shared/clock'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { InjectRepository } from '@mikro-orm/nestjs'
import { Inject, Injectable } from '@nestjs/common'

interface CacheEntry {
	expiresAt: number
	response: LeaderboardResponseDto
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

// MikroORM v7's QueryBuilder cannot express this query cleanly: select-side
// `.as()` aliases do not propagate to orderBy key resolution (v7 keeps
// resolving orderBy against entity props, throwing "Trying to query by not
// existing property"). Raw SQL via the connection is the supported escape
// hatch — parameterized, dialect-aware, and avoids the criteria machinery.
@Injectable()
export class GetLeaderboardUseCase {
	private readonly cache = new Map<LeaderboardWindow, CacheEntry>()

	constructor(
		@InjectRepository(Bet)
		private readonly bets: BaseRepository<Bet>,
		@Inject(CLOCK) private readonly clock: Clock,
	) {}

	async execute(query: GetLeaderboardQuery): Promise<LeaderboardResponseDto> {
		const now = this.clock.now()
		const cached = this.cache.get(query.window)
		if (cached && cached.expiresAt > now.getTime()) {
			return cached.response
		}

		const windowStart = new Date(now.getTime() - WINDOW_MS[query.window])
		const sql = `
			SELECT
				user_id AS "userId",
				username AS "username",
				SUM(payout_cents - amount_cents)::text AS "winningsCents",
				COUNT(*)::int AS "betsCount",
				MAX(cashout_multiplier_hundredths)::int AS "biggestMultiplierHundredths"
			FROM bets
			WHERE status = ? AND created_at > ?
			GROUP BY user_id, username
			ORDER BY "winningsCents" DESC
			LIMIT ?
		`
		const rows = await this.bets
			.getEntityManager()
			.getConnection()
			.execute<QueryRow[]>(sql, [BetStatus.WON, windowStart, query.limit])

		const response: LeaderboardResponseDto = {
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
