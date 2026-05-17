import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { RoundDto } from '../../../../application/round/dtos/round.dto';
import { GetCurrentRoundQuery } from '../../../../application/round/dtos/get-current-round.query';
import { GetCurrentRoundUseCase } from '../../../../application/round/use-cases/get-current-round.use-case';

@QueryHandler(GetCurrentRoundQuery)
export class GetCurrentRoundHandler
  implements IQueryHandler<GetCurrentRoundQuery, RoundDto | null>
{
  constructor(private readonly useCase: GetCurrentRoundUseCase) {}

  execute(): Promise<RoundDto | null> {
    return this.useCase.execute();
  }
}
