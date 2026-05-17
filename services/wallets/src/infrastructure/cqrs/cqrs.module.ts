import { Module } from '@nestjs/common';
import { CqrsModule as NestCqrsModule } from '@nestjs/cqrs';
import { ApplicationModule } from '../../application/application.module';
import { CreateWalletHandler } from './handlers/wallet/create-wallet.handler';
import { CreditWalletHandler } from './handlers/wallet/credit-wallet.handler';
import { DebitWalletHandler } from './handlers/wallet/debit-wallet.handler';
import { GetWalletHandler } from './handlers/wallet/get-wallet.handler';

const HANDLERS = [
  CreateWalletHandler,
  CreditWalletHandler,
  DebitWalletHandler,
  GetWalletHandler,
];

@Module({
  imports: [NestCqrsModule, ApplicationModule],
  providers: [...HANDLERS],
  exports: [NestCqrsModule],
})
export class CqrsBusModule {}
