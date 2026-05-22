import {
	LEADERBOARD_WINDOWS,
	LeaderboardResponseDto,
	LeaderboardWindow,
} from '@application/leaderboard/dtos/leaderboard.dto'
import { GetLeaderboardQuery } from '@application/leaderboard/dtos/get-leaderboard.query'
import { BadRequestException, Controller, Get, Query } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import {
	ApiExtraModels,
	ApiOkResponse,
	ApiOperation,
	ApiQuery,
	ApiTags,
} from '@nestjs/swagger'

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
@ApiExtraModels(LeaderboardResponseDto)
@Controller('leaderboard')
export class LeaderboardController {
	constructor(private readonly queryBus: QueryBus) {}

	@Get()
	@ApiOperation({
		operationId: 'getLeaderboard',
		summary: 'Top players by gross winnings over a sliding time window.',
	})
	@ApiQuery({
		name: 'window',
		enum: LeaderboardWindow,
		enumName: 'LeaderboardWindow',
		required: false,
	})
	@ApiQuery({
		name: 'limit',
		required: false,
		schema: { type: 'integer', minimum: 1, maximum: MAX_LIMIT },
	})
	@ApiOkResponse({
		description: 'Leaderboard snapshot.',
		type: LeaderboardResponseDto,
	})
	async leaderboard(
		@Query('window') windowRaw?: string,
		@Query('limit') limitRaw?: string,
	): Promise<LeaderboardResponseDto> {
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
