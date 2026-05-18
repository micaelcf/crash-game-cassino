import { WalletDebitFailedCommand } from '@application/bet/dtos/wallet-debit-failed.command'
import { WalletDebitFailedUseCase } from '@application/bet/use-cases/wallet-debit-failed.use-case'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'

@CommandHandler(WalletDebitFailedCommand)
export class WalletDebitFailedHandler
	implements ICommandHandler<WalletDebitFailedCommand>
{
	constructor(private readonly useCase: WalletDebitFailedUseCase) {}

	execute(command: WalletDebitFailedCommand): Promise<void> {
		return this.useCase.execute(command)
	}
}
