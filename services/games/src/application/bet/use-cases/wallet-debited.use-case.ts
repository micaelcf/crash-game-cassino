import { WalletDebitedCommand } from '@application/bet/dtos/wallet-debited.command'
import { Bet, BetStatus } from '@domain/bet/bet.entity'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { InboxEvent } from '@infrastructure/messaging/inbox/inbox-event.entity'
import {
	GAME_BROADCASTER,
	type GameBroadcaster,
} from '@infrastructure/websocket/game.gateway.interface'
import { InjectRepository } from '@mikro-orm/nestjs'
import { Inject, Injectable } from '@nestjs/common'

@Injectable()
export class WalletDebitedUseCase {
	constructor(
		@InjectRepository(Bet)
		private readonly bets: BaseRepository<Bet>,
		@InjectRepository(InboxEvent)
		private readonly inbox: BaseRepository<InboxEvent>,
		@Inject(GAME_BROADCASTER)
		private readonly broadcaster: GameBroadcaster,
	) {}

	async execute(command: WalletDebitedCommand): Promise<void> {
		const alreadyProcessed = await this.inbox.findOne({
			id: command.messageId,
		})
		if (alreadyProcessed) return

		const bet = await this.bets.findOne({ id: command.betId })
		this.inbox.create({ id: command.messageId })

		const justConfirmed = bet && bet.status === BetStatus.PENDING
		if (justConfirmed) {
			bet.confirm()
		}

		await this.bets.flush()

		if (justConfirmed) {
			this.broadcaster.emitBetPlaced({
				roundId: bet.roundId,
				betId: bet.id,
				userId: bet.userId,
				username: bet.username,
				amountCents: bet.amountCents.toString(),
			})
		}
	}
}
