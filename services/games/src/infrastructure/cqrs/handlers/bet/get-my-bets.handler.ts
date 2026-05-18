import { BetDto } from '@application/bet/dtos/bet.dto'
import { GetMyBetsQuery } from '@application/bet/dtos/get-my-bets.query'
import { GetMyBetsUseCase } from '@application/bet/use-cases/get-my-bets.use-case'
import { PagedResult } from '@application/shared/paged-result'
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'

@QueryHandler(GetMyBetsQuery)
export class GetMyBetsHandler
	implements IQueryHandler<GetMyBetsQuery, PagedResult<BetDto>>
{
	constructor(private readonly useCase: GetMyBetsUseCase) {}

	execute(query: GetMyBetsQuery): Promise<PagedResult<BetDto>> {
		return this.useCase.execute(query)
	}
}
