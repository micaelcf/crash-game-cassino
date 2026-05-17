import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Bet } from '../domain/bet/bet.entity';
import { DomainModule } from '../domain/domain.module';
import { Round } from '../domain/round/round.entity';
import { InboxEvent } from '../infrastructure/messaging/inbox/inbox-event.entity';
import { EventPublisher } from '../infrastructure/messaging/outbox/event-publisher.service';
import { OutboxEvent } from '../infrastructure/messaging/outbox/outbox-event.entity';
// bet use cases
import { CashOutUseCase } from './bet/use-cases/cash-out.use-case';
import { GetMyBetsUseCase } from './bet/use-cases/get-my-bets.use-case';
import { PlaceBetUseCase } from './bet/use-cases/place-bet.use-case';
import { WalletDebitFailedUseCase } from './bet/use-cases/wallet-debit-failed.use-case';
import { WalletDebitedUseCase } from './bet/use-cases/wallet-debited.use-case';
// round use cases
import { GetCurrentRoundUseCase } from './round/use-cases/get-current-round.use-case';
import { GetRoundHistoryUseCase } from './round/use-cases/get-round-history.use-case';
import { GetRoundVerifyUseCase } from './round/use-cases/get-round-verify.use-case';

@Module({
  imports: [
    DomainModule,
    MikroOrmModule.forFeature([Round, Bet, InboxEvent, OutboxEvent]),
  ],
  providers: [
    PlaceBetUseCase,
    CashOutUseCase,
    WalletDebitedUseCase,
    WalletDebitFailedUseCase,
    GetMyBetsUseCase,
    GetCurrentRoundUseCase,
    GetRoundHistoryUseCase,
    GetRoundVerifyUseCase,
    EventPublisher,
  ],
  exports: [
    PlaceBetUseCase,
    CashOutUseCase,
    WalletDebitedUseCase,
    WalletDebitFailedUseCase,
    GetMyBetsUseCase,
    GetCurrentRoundUseCase,
    GetRoundHistoryUseCase,
    GetRoundVerifyUseCase,
    EventPublisher,
  ],
})
export class ApplicationModule {}
