// bet use cases
import { CashOutUseCase } from '@application/bet/use-cases/cash-out.use-case'
import { GetMyBetsUseCase } from '@application/bet/use-cases/get-my-bets.use-case'
import { PlaceBetUseCase } from '@application/bet/use-cases/place-bet.use-case'
import { WalletDebitFailedUseCase } from '@application/bet/use-cases/wallet-debit-failed.use-case'
import { WalletDebitedUseCase } from '@application/bet/use-cases/wallet-debited.use-case'
// leaderboard use cases
import { GetLeaderboardUseCase } from '@application/leaderboard/use-cases/get-leaderboard.use-case'
// round use cases
import { GetCurrentRoundUseCase } from '@application/round/use-cases/get-current-round.use-case'
import { GetRoundHistoryUseCase } from '@application/round/use-cases/get-round-history.use-case'
import { GetRoundVerifyUseCase } from '@application/round/use-cases/get-round-verify.use-case'
import { Bet } from '@domain/bet/bet.entity'
import { DomainModule } from '@domain/domain.module'
import { Round } from '@domain/round/round.entity'
import { InboxEvent } from '@infrastructure/messaging/inbox/inbox-event.entity'
import { EventPublisher } from '@infrastructure/messaging/outbox/event-publisher.service'
import { OutboxEvent } from '@infrastructure/messaging/outbox/outbox-event.entity'
import { WebsocketModule } from '@infrastructure/websocket/websocket.module'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'

@Module({
	imports: [
		DomainModule,
		WebsocketModule,
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
		GetLeaderboardUseCase,
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
		GetLeaderboardUseCase,
		EventPublisher,
	],
})
export class ApplicationModule {}
