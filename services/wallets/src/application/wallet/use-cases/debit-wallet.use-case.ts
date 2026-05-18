import { DebitWalletCommand } from '@application/wallet/dtos/debit-wallet.command'
import { InsufficientBalanceException } from '@domain/wallet/insufficient-balance.exception'
import { Wallet } from '@domain/wallet/wallet.entity'
import { BaseRepository } from '@infrastructure/db/base.repository'
import { InboxEvent } from '@infrastructure/messaging/inbox/inbox-event.entity'
import { EventPublisher } from '@infrastructure/messaging/outbox/event-publisher.service'
import { WalletMetrics } from '@infrastructure/observability/wallet-metrics'
import { InjectRepository } from '@mikro-orm/nestjs'
import { Injectable } from '@nestjs/common'

@Injectable()
export class DebitWalletUseCase {
	constructor(
		@InjectRepository(Wallet)
		private readonly walletRepository: BaseRepository<Wallet>,
		@InjectRepository(InboxEvent)
		private readonly inboxRepository: BaseRepository<InboxEvent>,
		private readonly events: EventPublisher,
		private readonly metrics: WalletMetrics,
	) {}

	async execute(command: DebitWalletCommand): Promise<void> {
		const alreadyProcessed = await this.inboxRepository.findOne({
			id: command.messageId,
		})
		if (alreadyProcessed) return

		const wallet = await this.walletRepository.findOne({
			playerId: command.userId,
		})

		if (!wallet) {
			this.inboxRepository.create({ id: command.messageId })
			this.events.publish('wallet.debit_failed', 'Wallet', command.userId, {
				userId: command.userId,
				roundId: command.roundId,
				betId: command.betId,
				reason: 'Wallet not found',
			})
			await this.walletRepository.flush()
			this.metrics.recordDebitFailed()
			return
		}

		try {
			wallet.debit(command.amount)
			this.inboxRepository.create({ id: command.messageId })
			this.events.publish('wallet.debited', 'Wallet', wallet.id, {
				userId: command.userId,
				roundId: command.roundId,
				betId: command.betId,
				amount: command.amount.toString(),
			})
			await this.walletRepository.flush()
			this.metrics.recordDebit()
		} catch (err) {
			if (err instanceof InsufficientBalanceException) {
				this.inboxRepository.create({ id: command.messageId })
				this.events.publish('wallet.debit_failed', 'Wallet', wallet.id, {
					userId: command.userId,
					roundId: command.roundId,
					betId: command.betId,
					reason: 'Insufficient balance',
				})
				await this.walletRepository.flush()
				this.metrics.recordDebitFailed()
				return
			}
			throw err
		}
	}
}
