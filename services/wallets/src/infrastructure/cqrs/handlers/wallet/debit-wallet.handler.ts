import { DebitWalletCommand } from '@application/wallet/dtos/debit-wallet.command'
import { DebitWalletUseCase } from '@application/wallet/use-cases/debit-wallet.use-case'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'

@CommandHandler(DebitWalletCommand)
export class DebitWalletHandler implements ICommandHandler<DebitWalletCommand> {
	constructor(private readonly useCase: DebitWalletUseCase) {}

	execute(command: DebitWalletCommand): Promise<void> {
		return this.useCase.execute(command)
	}
}
