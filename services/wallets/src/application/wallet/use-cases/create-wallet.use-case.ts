import { CreateWalletCommand } from '@application/wallet/dtos/create-wallet.command'
import { Wallet } from '@domain/wallet/wallet.entity'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { InjectRepository } from '@mikro-orm/nestjs'
import { ConflictException, Injectable } from '@nestjs/common'

const DEFAULT_BALANCE_CENTS = 100000n

@Injectable()
export class CreateWalletUseCase {
	constructor(
		@InjectRepository(Wallet)
		private readonly walletRepository: BaseRepository<Wallet>,
	) {}

	async execute(command: CreateWalletCommand): Promise<Wallet> {
		const existing = await this.walletRepository.findOne({
			playerId: command.playerId,
		})
		if (existing) {
			throw new ConflictException('Wallet already exists for this player')
		}

		const wallet = this.walletRepository.create({
			playerId: command.playerId,
			balance: DEFAULT_BALANCE_CENTS,
		})
		await this.walletRepository.flush()
		return wallet
	}
}
