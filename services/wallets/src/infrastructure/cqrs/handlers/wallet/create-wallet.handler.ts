import { CreateWalletCommand } from '@application/wallet/dtos/create-wallet.command'
import { CreateWalletUseCase } from '@application/wallet/use-cases/create-wallet.use-case'
import { Wallet } from '@domain/wallet/wallet.entity'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'

@CommandHandler(CreateWalletCommand)
export class CreateWalletHandler
	implements ICommandHandler<CreateWalletCommand, Wallet>
{
	constructor(private readonly useCase: CreateWalletUseCase) {}

	execute(command: CreateWalletCommand): Promise<Wallet> {
		return this.useCase.execute(command)
	}
}
