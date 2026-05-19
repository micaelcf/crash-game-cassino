import { GetCurrentRoundQuery } from '@application/round/dtos/get-current-round.query'
import { GetRoundHistoryQuery } from '@application/round/dtos/get-round-history.query'
import { GetRoundVerifyQuery } from '@application/round/dtos/get-round-verify.query'
import { RoundNotCrashedException } from '@domain/round/round.exceptions'
import { ApiPagedOkResponse } from '@infrastructure/http/dtos/paged-response.openapi'
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
	@ApiOperation({
		summary:
			'Return the round currently open for bets or in flight, or null between rounds.',
	})
	@ApiOkResponse({
		description:
			'Active round snapshot, or null when no round is in BETTING_PHASE/FLYING.',
		schema: {
			oneOf: [
				{ type: 'null' },
				{
					type: 'object',
					required: [
						'id',
						'nonce',
						'status',
						'hashCommitment',
						'clientSeed',
						'bettingEndsAt',
						'flyingStartedAt',
						'crashedAt',
						'growthRate',
						'crashPointHundredths',
						'serverSeed',
						'bets',
						'serverTime',
					],
					properties: {
						id: { type: 'string', format: 'uuid' },
						nonce: { type: 'integer' },
						status: {
							type: 'string',
							enum: ['BETTING_PHASE', 'FLYING'],
						},
						hashCommitment: { type: 'string' },
						clientSeed: { type: 'string' },
						bettingEndsAt: { type: 'string', format: 'date-time' },
						flyingStartedAt: {
							type: 'string',
							format: 'date-time',
							nullable: true,
						},
						crashedAt: { type: 'null' },
						growthRate: { type: 'number' },
						crashPointHundredths: { type: 'null' },
						serverSeed: { type: 'null' },
						bets: { type: 'array', items: { type: 'object' } },
						serverTime: { type: 'string', format: 'date-time' },
					},
				},
			],
		},
	})
	async currentRound() {
		return this.queryBus.execute(new GetCurrentRoundQuery())
	}

	@Get('history')
	@ApiOperation({ summary: 'Paginated history of crashed rounds.' })
	@ApiPagedOkResponse('Paginated round history.')
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
