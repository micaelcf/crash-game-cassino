import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { InsufficientBalanceException } from '../../../domain/wallet/insufficient-balance.exception';
import { Wallet } from '../../../domain/wallet/wallet.entity';
import { InboxEvent } from '../../../infrastructure/messaging/inbox/inbox-event.entity';
import { EventPublisher } from '../../../infrastructure/messaging/outbox/event-publisher.service';
import { BaseRepository } from '../../../infrastructure/db/base.repository';
import { DebitWalletCommand } from '../commands/debit-wallet.command';

@Injectable()
export class DebitWalletUseCase {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: BaseRepository<Wallet>,
    @InjectRepository(InboxEvent)
    private readonly inboxRepository: BaseRepository<InboxEvent>,
    private readonly events: EventPublisher,
  ) {}

  async execute(command: DebitWalletCommand): Promise<void> {
    const alreadyProcessed = await this.inboxRepository.findOne({
      id: command.messageId,
    });
    if (alreadyProcessed) return;

    const wallet = await this.walletRepository.findOne({
      playerId: command.userId,
    });

    if (!wallet) {
      this.inboxRepository.create({ id: command.messageId });
      this.events.publish('wallet.debit_failed', 'Wallet', command.userId, {
        userId: command.userId,
        roundId: command.roundId,
        reason: 'Wallet not found',
      });
      await this.walletRepository.flush();
      return;
    }

    try {
      wallet.debit(command.amount);
      this.inboxRepository.create({ id: command.messageId });
      this.events.publish('wallet.debited', 'Wallet', wallet.id, {
        userId: command.userId,
        roundId: command.roundId,
        amount: command.amount.toString(),
      });
      await this.walletRepository.flush();
    } catch (err) {
      if (err instanceof InsufficientBalanceException) {
        this.inboxRepository.create({ id: command.messageId });
        this.events.publish('wallet.debit_failed', 'Wallet', wallet.id, {
          userId: command.userId,
          roundId: command.roundId,
          reason: 'Insufficient balance',
        });
        await this.walletRepository.flush();
        return;
      }
      throw err;
    }
  }
}
