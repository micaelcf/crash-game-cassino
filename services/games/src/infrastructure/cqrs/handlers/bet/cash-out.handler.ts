import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CashOutCommand } from '../../../../application/bet/dtos/cash-out.command';
import { CashOutUseCase } from '../../../../application/bet/use-cases/cash-out.use-case';
import { Bet } from '../../../../domain/bet/bet.entity';

@CommandHandler(CashOutCommand)
export class CashOutHandler implements ICommandHandler<CashOutCommand, Bet> {
  constructor(private readonly useCase: CashOutUseCase) {}

  execute(command: CashOutCommand): Promise<Bet> {
    return this.useCase.execute(command);
  }
}
