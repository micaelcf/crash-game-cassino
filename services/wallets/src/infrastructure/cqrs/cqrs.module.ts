import { ApplicationModule } from '@application/application.module'
import { CreditWalletHandler } from '@infrastructure/cqrs/handlers/wallet/credit-wallet.handler'
import { DebitWalletHandler } from '@infrastructure/cqrs/handlers/wallet/debit-wallet.handler'
import { EnsureWalletHandler } from '@infrastructure/cqrs/handlers/wallet/ensure-wallet.handler'
import { GetWalletHandler } from '@infrastructure/cqrs/handlers/wallet/get-wallet.handler'
import { Module } from '@nestjs/common'
import { CqrsModule as NestCqrsModule } from '@nestjs/cqrs'

const HANDLERS = [
	CreditWalletHandler,
	DebitWalletHandler,
	EnsureWalletHandler,
	GetWalletHandler,
]

@Module({
	imports: [NestCqrsModule, ApplicationModule],
	providers: [...HANDLERS],
	exports: [NestCqrsModule],
})
export class CqrsBusModule {}
