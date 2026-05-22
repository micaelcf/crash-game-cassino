import { ApiProperty } from '@nestjs/swagger'
import { IsString, Matches, MaxLength } from 'class-validator'

/**
 * Request body for `POST /games/bet`.
 *
 * `amount` is a positive integer cents string (e.g. "1000" = R$ 10.00).
 * Kept as a string to preserve BigInt precision over JSON.
 */
export class PlaceBetDto {
	@ApiProperty({
		description: 'Bet amount in integer cents, e.g. "1000" for R$ 10.00.',
		example: '1000',
	})
	@IsString()
	@Matches(/^[0-9]+$/, {
		message: 'amount must be a positive integer string in cents',
	})
	@MaxLength(20)
	amount!: string
}
