import { EnsureWalletCommand } from '@application/wallet/dtos/ensure-wallet.command'
import { Wallet } from '@domain/wallet/wallet.entity'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { InjectRepository } from '@mikro-orm/nestjs'
import { Injectable } from '@nestjs/common'

const DEFAULT_BALANCE_CENTS = 100000n

@Injectable()
export class EnsureWalletUseCase {
	constructor(
		@InjectRepository(Wallet)
		private readonly walletRepository: BaseRepository<Wallet>,
	) {}

	// Idempotent upsert: returns existing wallet or provisions one with the
	// default balance. Wallet identity is 1:1 with playerId so there is no
	// meaningful conflict — first read wins, others reuse.
	async execute(command: EnsureWalletCommand): Promise<Wallet> {
		const existing = await this.walletRepository.findOne({
			playerId: command.playerId,
		})
		if (existing) return existing

		const wallet = this.walletRepository.create({
			playerId: command.playerId,
			balance: DEFAULT_BALANCE_CENTS,
		})
		await this.walletRepository.flush()
		return wallet
	}
}
