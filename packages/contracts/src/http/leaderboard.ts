/**
 * Top players by gross winnings over a sliding time window.
 *
 * Money fields are integer-cents serialized as strings (BigInt safety).
 * Multipliers are integer hundredths (250 → 2.50x).
 */

export const LeaderboardWindow = {
	TWENTY_FOUR_HOURS: '24h',
	SEVEN_DAYS: '7d',
} as const

export type LeaderboardWindow =
	(typeof LeaderboardWindow)[keyof typeof LeaderboardWindow]

export const LEADERBOARD_WINDOWS = Object.values(
	LeaderboardWindow,
) as readonly LeaderboardWindow[]

export interface LeaderboardEntryDto {
	userId: string
	username: string
	winningsCents: string
	betsCount: number
	biggestMultiplierHundredths: number
}

export interface LeaderboardResponse {
	window: LeaderboardWindow
	entries: LeaderboardEntryDto[]
	generatedAt: string
}
