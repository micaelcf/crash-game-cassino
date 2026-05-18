import { GetCurrentRoundQuery } from '@application/round/dtos/get-current-round.query'
import { GetRoundHistoryQuery } from '@application/round/dtos/get-round-history.query'
import { GetRoundVerifyQuery } from '@application/round/dtos/get-round-verify.query'
import { RoundNotCrashedException } from '@domain/round/round.exceptions'
import { PaginationDto } from '@infrastructure/http/dtos/pagination.dto'
import {
	BadRequestException,
	Controller,
	Get,
	Param,
	Query,
} from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import {
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from '@nestjs/swagger'

@ApiTags('rounds')
@Controller('rounds')
export class RoundsController {
	constructor(private readonly queryBus: QueryBus) {}

	@Get('current')
	@ApiOperation({ summary: 'Return the current round and its placed bets.' })
	@ApiOkResponse({ description: 'Current round snapshot.' })
	async currentRound() {
		return this.queryBus.execute(new GetCurrentRoundQuery())
	}

	@Get('history')
	@ApiOperation({ summary: 'Paginated history of crashed rounds.' })
	@ApiOkResponse({ description: 'Paginated round history.' })
	async roundHistory(@Query() page: PaginationDto) {
		return this.queryBus.execute(
			new GetRoundHistoryQuery(page.page, page.pageSize),
		)
	}

	@Get(':roundId/verify')
	@ApiOperation({ summary: 'Reveal the provably-fair verification payload.' })
	@ApiOkResponse({
		description: 'Server seed, client seed, nonce and crash point.',
	})
	@ApiNotFoundResponse({
		description: 'Round not found or has not crashed yet.',
	})
	async verifyRound(@Param('roundId') roundId: string) {
		try {
			return await this.queryBus.execute(new GetRoundVerifyQuery(roundId))
		} catch (err) {
			if (err instanceof RoundNotCrashedException) {
				throw new BadRequestException(err.message)
			}
			throw err
		}
	}
}
