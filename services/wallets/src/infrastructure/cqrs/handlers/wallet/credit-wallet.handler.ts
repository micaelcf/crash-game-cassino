import { CreditWalletCommand } from '@application/wallet/dtos/credit-wallet.command'
import { CreditWalletUseCase } from '@application/wallet/use-cases/credit-wallet.use-case'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'

@CommandHandler(CreditWalletCommand)
export class CreditWalletHandler
	implements ICommandHandler<CreditWalletCommand>
{
	constructor(private readonly useCase: CreditWalletUseCase) {}

	execute(command: CreditWalletCommand): Promise<void> {
		return this.useCase.execute(command)
	}
}
