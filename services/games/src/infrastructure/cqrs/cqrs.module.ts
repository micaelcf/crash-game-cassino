import { ApplicationModule } from '@application/application.module'
import { CashOutHandler } from '@infrastructure/cqrs/handlers/bet/cash-out.handler'
import { GetMyBetsHandler } from '@infrastructure/cqrs/handlers/bet/get-my-bets.handler'
import { PlaceBetHandler } from '@infrastructure/cqrs/handlers/bet/place-bet.handler'
import { WalletDebitFailedHandler } from '@infrastructure/cqrs/handlers/bet/wallet-debit-failed.handler'
import { WalletDebitedHandler } from '@infrastructure/cqrs/handlers/bet/wallet-debited.handler'
import { GetCurrentRoundHandler } from '@infrastructure/cqrs/handlers/round/get-current-round.handler'
import { GetRoundHistoryHandler } from '@infrastructure/cqrs/handlers/round/get-round-history.handler'
import { GetRoundVerifyHandler } from '@infrastructure/cqrs/handlers/round/get-round-verify.handler'
import { Module } from '@nestjs/common'
import { CqrsModule as NestCqrsModule } from '@nestjs/cqrs'

const HANDLERS = [
	// bet
	PlaceBetHandler,
	CashOutHandler,
	WalletDebitedHandler,
	WalletDebitFailedHandler,
	GetMyBetsHandler,
	// round
	GetCurrentRoundHandler,
	GetRoundHistoryHandler,
	GetRoundVerifyHandler,
]

@Module({
	imports: [NestCqrsModule, ApplicationModule],
	providers: [...HANDLERS],
	exports: [NestCqrsModule],
})
export class CqrsBusModule {}
