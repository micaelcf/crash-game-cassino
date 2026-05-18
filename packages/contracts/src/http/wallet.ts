export interface WalletDto {
	id: string
	playerId: string
	/** Integer cents serialized as string to preserve bigint precision. */
	balance: string
	createdAt?: string
}
