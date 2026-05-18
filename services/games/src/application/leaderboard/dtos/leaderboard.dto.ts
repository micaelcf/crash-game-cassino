import type { LeaderboardEntryDto, LeaderboardResponse } from '@crash/contracts'

export type { LeaderboardEntryDto, LeaderboardResponse }

export interface LeaderboardRow {
	userId: string
	username: string
	winningsCents: bigint
	betsCount: number
	biggestMultiplierHundredths: number
}

export const toLeaderboardEntry = (
	row: LeaderboardRow,
): LeaderboardEntryDto => ({
	userId: row.userId,
	username: row.username,
	winningsCents: row.winningsCents.toString(),
	betsCount: row.betsCount,
	biggestMultiplierHundredths: row.biggestMultiplierHundredths,
})
