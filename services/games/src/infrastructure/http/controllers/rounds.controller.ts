import { GetCurrentRoundQuery } from '@application/round/dtos/get-current-round.query'
import { GetRoundHistoryQuery } from '@application/round/dtos/get-round-history.query'
import { GetRoundVerifyQuery } from '@application/round/dtos/get-round-verify.query'
import { RoundDto, RoundVerifyDto } from '@application/round/dtos/round.dto'
import { RoundNotCrashedException } from '@domain/round/round.exceptions'
import { PagedDto } from '@infrastructure/http/dtos/paged-response.openapi'
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
	ApiExtraModels,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from '@nestjs/swagger'

const PagedRoundDto = PagedDto(RoundDto)

@ApiTags('rounds')
@ApiExtraModels(RoundDto, RoundVerifyDto, PagedRoundDto)
@Controller('rounds')
export class RoundsController {
	constructor(private readonly queryBus: QueryBus) {}

	@Get('current')
	@ApiOperation({
		operationId: 'getCurrentRound',
		summary:
			'Return the round currently open for bets or in flight, or null between rounds.',
	})
	@ApiOkResponse({
		description:
			'Active round snapshot, or null when no round is in BETTING_PHASE/FLYING.',
		type: RoundDto,
		nullable: true,
	})
	async currentRound(): Promise<RoundDto | null> {
		return this.queryBus.execute(new GetCurrentRoundQuery())
	}

	@Get('history')
	@ApiOperation({
		operationId: 'getRoundHistory',
		summary: 'Paginated history of crashed rounds.',
	})
	@ApiOkResponse({
		description: 'Paginated round history.',
		type: PagedRoundDto,
	})
	async roundHistory(@Query() page: PaginationDto) {
		return this.queryBus.execute(
			new GetRoundHistoryQuery(page.page, page.pageSize),
		)
	}

	@Get(':roundId/verify')
	@ApiOperation({
		operationId: 'verifyRound',
		summary: 'Reveal the provably-fair verification payload.',
	})
	@ApiOkResponse({
		description: 'Server seed, client seed, nonce and crash point.',
		type: RoundVerifyDto,
	})
	@ApiNotFoundResponse({
		description: 'Round not found or has not crashed yet.',
	})
	async verifyRound(
		@Param('roundId') roundId: string,
	): Promise<RoundVerifyDto> {
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
