import { ApiProperty } from '@nestjs/swagger'

/**
 * Sliding time window for leaderboard aggregations. Re-declared on the
 * backend as the source-of-truth so OpenAPI can emit a real enum schema;
 * frontend gets the value via the generated client.
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

export interface LeaderboardRow {
	userId: string
	username: string
	winningsCents: bigint
	betsCount: number
	biggestMultiplierHundredths: number
}

/**
 * One leaderboard row. Money fields are integer cents serialized as
 * strings (BigInt safety). Multipliers are integer hundredths.
 */
export class LeaderboardEntryDto {
	@ApiProperty({ description: 'Owner user id.' })
	userId!: string

	@ApiProperty()
	username!: string

	@ApiProperty({
		description: 'Gross winnings in integer cents as a string.',
		example: '12500',
	})
	winningsCents!: string

	@ApiProperty({ description: 'Number of bets contributing to the row.' })
	betsCount!: number

	@ApiProperty({
		description: 'Biggest multiplier hit in integer hundredths (250 = 2.50x).',
		example: 250,
	})
	biggestMultiplierHundredths!: number
}

export class LeaderboardResponseDto {
	@ApiProperty({ enum: LeaderboardWindow, enumName: 'LeaderboardWindow' })
	window!: LeaderboardWindow

	@ApiProperty({ type: [LeaderboardEntryDto] })
	entries!: LeaderboardEntryDto[]

	@ApiProperty({
		format: 'date-time',
		description: 'Generation timestamp; used as a freshness cue by the UI.',
	})
	generatedAt!: string
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
