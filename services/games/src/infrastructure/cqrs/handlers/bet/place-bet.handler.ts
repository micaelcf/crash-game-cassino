import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaceBetCommand } from '../../../../application/bet/dtos/place-bet.command';
import { PlaceBetUseCase } from '../../../../application/bet/use-cases/place-bet.use-case';
import { Bet } from '../../../../domain/bet/bet.entity';

@CommandHandler(PlaceBetCommand)
export class PlaceBetHandler implements ICommandHandler<PlaceBetCommand, Bet> {
  constructor(private readonly useCase: PlaceBetUseCase) {}

  execute(command: PlaceBetCommand): Promise<Bet> {
    return this.useCase.execute(command);
  }
}
