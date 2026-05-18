import { GetRoundHistoryQuery } from '@application/round/dtos/get-round-history.query'
import { RoundDto } from '@application/round/dtos/round.dto'
import { GetRoundHistoryUseCase } from '@application/round/use-cases/get-round-history.use-case'
import { PagedResult } from '@application/shared/paged-result'
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'

@QueryHandler(GetRoundHistoryQuery)
export class GetRoundHistoryHandler
	implements IQueryHandler<GetRoundHistoryQuery, PagedResult<RoundDto>>
{
	constructor(private readonly useCase: GetRoundHistoryUseCase) {}

	execute(query: GetRoundHistoryQuery): Promise<PagedResult<RoundDto>> {
		return this.useCase.execute(query)
	}
}
