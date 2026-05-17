import { Module } from '@nestjs/common';
import { CqrsModule as NestCqrsModule } from '@nestjs/cqrs';
import { ApplicationModule } from '../../application/application.module';
import { CashOutHandler } from './handlers/bet/cash-out.handler';
import { GetMyBetsHandler } from './handlers/bet/get-my-bets.handler';
import { PlaceBetHandler } from './handlers/bet/place-bet.handler';
import { WalletDebitFailedHandler } from './handlers/bet/wallet-debit-failed.handler';
import { WalletDebitedHandler } from './handlers/bet/wallet-debited.handler';
import { GetCurrentRoundHandler } from './handlers/round/get-current-round.handler';
import { GetRoundHistoryHandler } from './handlers/round/get-round-history.handler';
import { GetRoundVerifyHandler } from './handlers/round/get-round-verify.handler';

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
];

@Module({
  imports: [NestCqrsModule, ApplicationModule],
  providers: [...HANDLERS],
  exports: [NestCqrsModule],
})
export class CqrsBusModule {}
