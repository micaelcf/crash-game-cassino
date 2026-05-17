import { InjectRepository } from '@mikro-orm/nestjs'
import { Injectable } from '@nestjs/common'
import { Bet, BetStatus } from '../../../domain/bet/bet.entity'
import { BaseRepository } from '../../../infrastructure/db/base.repository'
import { InboxEvent } from '../../../infrastructure/messaging/inbox/inbox-event.entity'
import { WalletDebitedCommand } from '../dtos/wallet-debited.command'

@Injectable()
export class WalletDebitedUseCase {
	constructor(
		@InjectRepository(Bet)
		private readonly bets: BaseRepository<Bet>,
		@InjectRepository(InboxEvent)
		private readonly inbox: BaseRepository<InboxEvent>,
	) {}

	async execute(command: WalletDebitedCommand): Promise<void> {
		const alreadyProcessed = await this.inbox.findOne({
			id: command.messageId,
		})
		if (alreadyProcessed) return

		const bet = await this.bets.findOne({ id: command.betId })
		this.inbox.create({ id: command.messageId })

		if (bet && bet.status === BetStatus.PENDING) {
			bet.confirm()
		}

		await this.bets.flush()
	}
}
