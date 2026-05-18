import type { WalletDto as WalletDtoContract } from '@crash/contracts'
import type { Wallet } from '@domain/wallet/wallet.entity'
import { ApiProperty } from '@nestjs/swagger'

/**
 * Swagger-decorated wrapper around the wire-format `WalletDto` from
 * `@crash/contracts`. The decorators stay backend-side; the cross-stack
 * type contract is enforced by `implements`.
 */
export class WalletDto implements WalletDtoContract {
	@ApiProperty({ description: 'Wallet identifier.' })
	id!: string

	@ApiProperty({ description: 'Owner player id (matches JWT sub claim).' })
	playerId!: string

	@ApiProperty({
		description:
			'Balance in integer cents as a string to preserve BigInt precision.',
		example: '100000',
	})
	balance!: string

	@ApiProperty({ required: false, type: String, format: 'date-time' })
	createdAt?: string
}

export const toWalletDto = (wallet: Wallet): WalletDto => ({
	id: wallet.id,
	playerId: wallet.playerId,
	balance: wallet.balance.toString(),
	createdAt: wallet.createdAt?.toISOString(),
})
