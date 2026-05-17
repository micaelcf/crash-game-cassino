import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { WalletDebitedCommand } from '../../../../application/bet/dtos/wallet-debited.command';
import { WalletDebitedUseCase } from '../../../../application/bet/use-cases/wallet-debited.use-case';

@CommandHandler(WalletDebitedCommand)
export class WalletDebitedHandler
  implements ICommandHandler<WalletDebitedCommand>
{
  constructor(private readonly useCase: WalletDebitedUseCase) {}

  execute(command: WalletDebitedCommand): Promise<void> {
    return this.useCase.execute(command);
  }
}
