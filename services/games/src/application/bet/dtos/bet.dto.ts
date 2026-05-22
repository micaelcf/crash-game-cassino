import { BetStatus } from '@crash/contracts'
import type { Bet } from '@domain/bet/bet.entity'
import { ApiProperty } from '@nestjs/swagger'

/**
 * Wire shape for a bet.
 *
 * Money fields are integer-cents serialized as strings to preserve
 * BigInt precision across JSON. Multipliers are integer hundredths
 * (so 1.50x → 150).
 */
export class BetDto {
	@ApiProperty({ format: 'uuid' })
	id!: string

	@ApiProperty({ description: 'Owner user id (matches JWT sub claim).' })
	userId!: string

	@ApiProperty()
	username!: string

	@ApiProperty({
		description: 'Bet amount in integer cents as a string.',
		example: '1000',
	})
	amountCents!: string

	@ApiProperty({ enum: BetStatus, enumName: 'BetStatus' })
	status!: BetStatus

	@ApiProperty({
		nullable: true,
		type: Number,
		description: 'Cashout multiplier in integer hundredths (150 = 1.50x).',
		example: 150,
	})
	cashoutMultiplierHundredths!: number | null

	@ApiProperty({
		nullable: true,
		type: String,
		description: 'Payout in integer cents as a string. null until settled.',
		example: '1500',
	})
	payoutCents!: string | null

	@ApiProperty({ format: 'date-time' })
	createdAt!: string
}

export const toBetDto = (bet: Bet): BetDto => ({
	id: bet.id,
	userId: bet.userId,
	username: bet.username,
	amountCents: bet.amountCents.toString(),
	status: bet.status,
	cashoutMultiplierHundredths: bet.cashoutMultiplierHundredths ?? null,
	payoutCents: bet.payoutCents != null ? bet.payoutCents.toString() : null,
	createdAt: bet.createdAt.toISOString(),
})
