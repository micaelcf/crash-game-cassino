import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetWalletQuery } from '../../../../application/wallet/dtos/get-wallet.query';
import { GetWalletUseCase } from '../../../../application/wallet/use-cases/get-wallet.use-case';
import { Wallet } from '../../../../domain/wallet/wallet.entity';

@QueryHandler(GetWalletQuery)
export class GetWalletHandler implements IQueryHandler<GetWalletQuery, Wallet> {
  constructor(private readonly useCase: GetWalletUseCase) {}

  execute(query: GetWalletQuery): Promise<Wallet> {
    return this.useCase.execute(query);
  }
}
