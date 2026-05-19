import { EnsureWalletCommand } from '@application/wallet/dtos/ensure-wallet.command'
import { GetWalletQuery } from '@application/wallet/dtos/get-wallet.query'
import { EnsureWalletUseCase } from '@application/wallet/use-cases/ensure-wallet.use-case'
import { Wallet } from '@domain/wallet/wallet.entity'
import { Injectable } from '@nestjs/common'

@Injectable()
export class GetWalletUseCase {
	constructor(private readonly ensure: EnsureWalletUseCase) {}

	// Read auto-provisions: 1:1 user↔wallet means the first GET after sign-up
	// creates the wallet with default balance. Idempotent — concurrent reads
	// resolve to the same row.
	async execute(query: GetWalletQuery): Promise<Wallet> {
		return this.ensure.execute(new EnsureWalletCommand(query.playerId))
	}
}
