import { CreateWalletUseCase } from '@application/wallet/use-cases/create-wallet.use-case'
import { CreditWalletUseCase } from '@application/wallet/use-cases/credit-wallet.use-case'
import { DebitWalletUseCase } from '@application/wallet/use-cases/debit-wallet.use-case'
import { GetWalletUseCase } from '@application/wallet/use-cases/get-wallet.use-case'
import { DomainModule } from '@domain/domain.module'
import { Wallet } from '@domain/wallet/wallet.entity'
import { InboxEvent } from '@infrastructure/messaging/inbox/inbox-event.entity'
import { EventPublisher } from '@infrastructure/messaging/outbox/event-publisher.service'
import { OutboxEvent } from '@infrastructure/messaging/outbox/outbox-event.entity'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'

@Module({
	imports: [
		DomainModule,
		MikroOrmModule.forFeature([Wallet, InboxEvent, OutboxEvent]),
	],
	providers: [
		CreateWalletUseCase,
		CreditWalletUseCase,
		DebitWalletUseCase,
		GetWalletUseCase,
		EventPublisher,
	],
	exports: [
		CreateWalletUseCase,
		CreditWalletUseCase,
		DebitWalletUseCase,
		GetWalletUseCase,
		EventPublisher,
	],
})
export class ApplicationModule {}
