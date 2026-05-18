import { GetLeaderboardQuery } from '@application/leaderboard/dtos/get-leaderboard.query'
import {
	LEADERBOARD_WINDOWS,
	type LeaderboardResponse,
	LeaderboardWindow,
} from '@crash/contracts'
import { BadRequestException, Controller, Get, Query } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 20

const parseLimit = (raw: string | undefined): number => {
	if (raw === undefined || raw === '') return DEFAULT_LIMIT
	const n = Number.parseInt(raw, 10)
	if (!Number.isInteger(n) || n < 1) {
		throw new BadRequestException('limit must be a positive integer')
	}
	return Math.min(n, MAX_LIMIT)
}

const isWindow = (value: string): value is LeaderboardWindow =>
	(LEADERBOARD_WINDOWS as readonly string[]).includes(value)

@ApiTags('leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
	constructor(private readonly queryBus: QueryBus) {}

	@Get()
	@ApiOperation({
		summary: 'Top players by gross winnings over a sliding time window.',
	})
	@ApiQuery({ name: 'window', enum: ['24h', '7d'], required: false })
	@ApiQuery({ name: 'limit', required: false, schema: { type: 'integer' } })
	@ApiOkResponse({ description: 'Leaderboard snapshot.' })
	async leaderboard(
		@Query('window') windowRaw?: string,
		@Query('limit') limitRaw?: string,
	): Promise<LeaderboardResponse> {
		const window = windowRaw ?? LeaderboardWindow.TWENTY_FOUR_HOURS
		if (!isWindow(window)) {
			throw new BadRequestException(
				`window must be one of: ${LEADERBOARD_WINDOWS.join(', ')}`,
			)
		}
		const limit = parseLimit(limitRaw)
		return this.queryBus.execute(new GetLeaderboardQuery(window, limit))
	}
}
