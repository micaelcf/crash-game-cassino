import { GetLeaderboardQuery } from '@application/leaderboard/dtos/get-leaderboard.query'
import type { LeaderboardResponseDto } from '@application/leaderboard/dtos/leaderboard.dto'
import { GetLeaderboardUseCase } from '@application/leaderboard/use-cases/get-leaderboard.use-case'
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'

@QueryHandler(GetLeaderboardQuery)
export class GetLeaderboardHandler
	implements IQueryHandler<GetLeaderboardQuery, LeaderboardResponseDto>
{
	constructor(private readonly useCase: GetLeaderboardUseCase) {}

	execute(query: GetLeaderboardQuery): Promise<LeaderboardResponseDto> {
		return this.useCase.execute(query)
	}
}
