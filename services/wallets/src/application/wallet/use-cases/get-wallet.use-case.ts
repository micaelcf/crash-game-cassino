import { GetWalletQuery } from '@application/wallet/dtos/get-wallet.query'
import { Wallet } from '@domain/wallet/wallet.entity'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { InjectRepository } from '@mikro-orm/nestjs'
import { Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class GetWalletUseCase {
	constructor(
		@InjectRepository(Wallet)
		private readonly walletRepository: BaseRepository<Wallet>,
	) {}

	async execute(query: GetWalletQuery): Promise<Wallet> {
		const wallet = await this.walletRepository.findOne({
			playerId: query.playerId,
		})
		if (!wallet) {
			throw new NotFoundException('Wallet not found')
		}
		return wallet
	}
}
