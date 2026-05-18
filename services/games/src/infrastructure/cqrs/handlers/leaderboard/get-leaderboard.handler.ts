import { GetLeaderboardQuery } from '@application/leaderboard/dtos/get-leaderboard.query'
import { GetLeaderboardUseCase } from '@application/leaderboard/use-cases/get-leaderboard.use-case'
import type { LeaderboardResponse } from '@crash/contracts'
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'

@QueryHandler(GetLeaderboardQuery)
export class GetLeaderboardHandler
	implements IQueryHandler<GetLeaderboardQuery, LeaderboardResponse>
{
	constructor(private readonly useCase: GetLeaderboardUseCase) {}

	execute(query: GetLeaderboardQuery): Promise<LeaderboardResponse> {
		return this.useCase.execute(query)
	}
}
