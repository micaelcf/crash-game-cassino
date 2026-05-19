import { EnsureWalletCommand } from '@application/wallet/dtos/ensure-wallet.command'
import { EnsureWalletUseCase } from '@application/wallet/use-cases/ensure-wallet.use-case'
import { Wallet } from '@domain/wallet/wallet.entity'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'

@CommandHandler(EnsureWalletCommand)
export class EnsureWalletHandler
	implements ICommandHandler<EnsureWalletCommand, Wallet>
{
	constructor(private readonly useCase: EnsureWalletUseCase) {}

	execute(command: EnsureWalletCommand): Promise<Wallet> {
		return this.useCase.execute(command)
	}
}
