import { GetRoundVerifyQuery } from '@application/round/dtos/get-round-verify.query'
import { GetRoundVerifyUseCase } from '@application/round/use-cases/get-round-verify.use-case'
import { RoundVerification } from '@domain/round/round.entity'
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'

@QueryHandler(GetRoundVerifyQuery)
export class GetRoundVerifyHandler
	implements IQueryHandler<GetRoundVerifyQuery, RoundVerification>
{
	constructor(private readonly useCase: GetRoundVerifyUseCase) {}

	execute(query: GetRoundVerifyQuery): Promise<RoundVerification> {
		return this.useCase.execute(query)
	}
}
