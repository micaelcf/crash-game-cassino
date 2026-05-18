import { CreditWalletCommand } from '@application/wallet/dtos/credit-wallet.command'
import { Wallet } from '@domain/wallet/wallet.entity'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { InboxEvent } from '@infrastructure/messaging/inbox/inbox-event.entity'
import { InjectRepository } from '@mikro-orm/nestjs'
import { Injectable } from '@nestjs/common'

@Injectable()
export class CreditWalletUseCase {
	constructor(
		@InjectRepository(Wallet)
		private readonly walletRepository: BaseRepository<Wallet>,
		@InjectRepository(InboxEvent)
		private readonly inboxRepository: BaseRepository<InboxEvent>,
	) {}

	async execute(command: CreditWalletCommand): Promise<void> {
		const alreadyProcessed = await this.inboxRepository.findOne({
			id: command.messageId,
		})
		if (alreadyProcessed) return

		const wallet = await this.walletRepository.findOne({
			playerId: command.userId,
		})
		if (!wallet) return

		wallet.credit(command.amount)
		this.inboxRepository.create({ id: command.messageId })
		await this.walletRepository.flush()
	}
}
