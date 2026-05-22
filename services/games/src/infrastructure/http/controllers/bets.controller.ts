import { BetDto, toBetDto } from '@application/bet/dtos/bet.dto'
import { CashOutCommand } from '@application/bet/dtos/cash-out.command'
import { GetMyBetsQuery } from '@application/bet/dtos/get-my-bets.query'
import { PlaceBetCommand } from '@application/bet/dtos/place-bet.command'
import { Bet } from '@domain/bet/bet.entity'
import {
	BetAmountOutOfRangeException,
	DuplicateBetException,
	NoActiveBetException,
} from '@domain/bet/bet.exceptions'
import {
	RoundNotBettingException,
	RoundNotFlyingException,
} from '@domain/round/round.exceptions'
import type { AuthenticatedRequest } from '@infrastructure/auth/auth-user'
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard'
import { PagedDto } from '@infrastructure/http/dtos/paged-response.openapi'
import { PaginationDto } from '@infrastructure/http/dtos/pagination.dto'
import { PlaceBetDto } from '@infrastructure/http/dtos/place-bet.dto'
import {
	BadRequestException,
	Body,
	ConflictException,
	Controller,
	Get,
	HttpCode,
	Post,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import {
	ApiBearerAuth,
	ApiConflictResponse,
	ApiCreatedResponse,
	ApiExtraModels,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from '@nestjs/swagger'

const PagedBetDto = PagedDto(BetDto)

@ApiTags('bets')
@ApiBearerAuth('logto')
@ApiExtraModels(BetDto, PagedBetDto)
@UseGuards(JwtAuthGuard)
@Controller()
export class BetsController {
	constructor(
		private readonly commandBus: CommandBus,
		private readonly queryBus: QueryBus,
	) {}

	@Get('bets/me')
	@ApiOperation({
		operationId: 'getMyBets',
		summary: 'List bets placed by the authenticated player.',
	})
	@ApiOkResponse({
		description: 'Paginated list of the player bets.',
		type: PagedBetDto,
	})
	async myBets(@Req() req: AuthenticatedRequest, @Query() page: PaginationDto) {
		return this.queryBus.execute(
			new GetMyBetsQuery(req.user.sub, page.page, page.pageSize),
		)
	}

	@Post('bet')
	@HttpCode(201)
	@ApiOperation({
		operationId: 'placeBet',
		summary: 'Place a bet on the current round.',
	})
	@ApiCreatedResponse({
		description: 'Bet accepted; persisted in PENDING.',
		type: BetDto,
	})
	@ApiConflictResponse({
		description:
			'Round not in BETTING_PHASE, duplicate bet for this round, or other domain conflict.',
	})
	async placeBet(
		@Req() req: AuthenticatedRequest,
		@Body() body: PlaceBetDto,
	): Promise<BetDto> {
		let amountCents: bigint
		try {
			amountCents = BigInt(body.amount)
		} catch {
			throw new BadRequestException(`Invalid amount: ${body.amount}`)
		}
		try {
			const bet: Bet = await this.commandBus.execute(
				new PlaceBetCommand(
					req.user.sub,
					req.user.username ?? req.user.sub,
					amountCents,
				),
			)
			return toBetDto(bet)
		} catch (err) {
			this.translate(err)
		}
	}

	@Post('bet/cashout')
	@HttpCode(200)
	@ApiOperation({
		operationId: 'cashOut',
		summary: 'Cash out the current bet at the live multiplier.',
	})
	@ApiOkResponse({
		description: 'Bet settled as WON with the payout.',
		type: BetDto,
	})
	@ApiConflictResponse({
		description:
			'Round not in FLYING, no active bet, or the bet was already settled.',
	})
	async cashOut(@Req() req: AuthenticatedRequest): Promise<BetDto> {
		try {
			const bet: Bet = await this.commandBus.execute(
				new CashOutCommand(req.user.sub),
			)
			return toBetDto(bet)
		} catch (err) {
			this.translate(err)
		}
	}

	private translate(err: unknown): never {
		if (err instanceof BetAmountOutOfRangeException) {
			throw new BadRequestException(err.message)
		}
		if (
			err instanceof DuplicateBetException ||
			err instanceof NoActiveBetException ||
			err instanceof RoundNotBettingException ||
			err instanceof RoundNotFlyingException
		) {
			throw new ConflictException(err.message)
		}
		throw err
	}
}
